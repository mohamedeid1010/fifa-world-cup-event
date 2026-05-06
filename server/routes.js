import express from 'express';
import sql from 'mssql';
import { getPool } from './db.js';
import { sseHandler, broadcastEvent } from './sse.js';

const router = express.Router();

router.get('/stream', sseHandler);

function parseUnifiedRequestId(requestId) {
  const normalizedId = String(requestId || '').trim();

  if (normalizedId.startsWith('assistance-')) {
    return {
      tableName: 'EmergencyRequest',
      numericId: normalizedId.slice('assistance-'.length)
    };
  }

  if (normalizedId.startsWith('food-')) {
    return {
      tableName: 'FoodOrder',
      numericId: normalizedId.slice('food-'.length)
    };
  }

  return null;
}

router.post('/auth/signup', async (req, res) => {
  try {
    const pool = await getPool();
    const { name, email, phone, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if email already exists
    const checkResult = await pool.request()
      .input('email', email)
      .query('SELECT user_id FROM Person WHERE email = @email');
      
    if (checkResult.recordset.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Split name
    const nameParts = (name || '').split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Generate new ID
    const idResult = await pool.request().query('SELECT ISNULL(MAX(user_id), 0) + 1 as newId FROM Person');
    const newId = idResult.recordset[0].newId;

    // Insert Person
    await pool.request()
      .input('id', newId)
      .input('first', firstName)
      .input('last', lastName)
      .input('phone', phone || '')
      .input('email', email)
      .input('pass', password)
      .query('INSERT INTO Person (user_id, first_name, last_name, phone, email, password) VALUES (@id, @first, @last, @phone, @email, @pass)');

    // Insert Attendee
    await pool.request()
      .input('id', newId)
      .query('INSERT INTO Attendee (user_id, emergency_contact) VALUES (@id, NULL)');

    res.status(201).json({ user: { id: newId, name: `${firstName} ${lastName}`.trim(), email, phone } });
  } catch (err) {
    console.error('POST /auth/signup error:', err);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const pool = await getPool();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.request()
      .input('email', email)
      .query('SELECT user_id, first_name, last_name, phone, email, password FROM Person WHERE email = @email');

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Plain text comparison
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ user: { id: user.user_id, name: `${user.first_name} ${user.last_name}`.trim(), email: user.email, phone: user.phone } });
  } catch (err) {
    console.error('POST /auth/login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Update password
router.put('/auth/password', async (req, res) => {
  try {
    const pool = await getPool();
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Email, current password, and new password are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    const result = await pool.request()
      .input('email', email)
      .query('SELECT user_id, password FROM Person WHERE email = @email');

    const user = result.recordset[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    await pool.request()
      .input('email', email)
      .input('newPass', newPassword)
      .query('UPDATE Person SET password = @newPass WHERE email = @email');

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /auth/password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.get('/seats', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        s.sector_name as section,
        rt.row_num as row,
        st.seat_id as seatNumber
      FROM Seat st
      JOIN RowTable rt ON st.row_id = rt.row_id
      JOIN Sector s ON rt.sector_id = s.sector_id
      WHERE st.status = 'Booked'
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('GET /seats error:', err);
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

router.get('/tickets', async (req, res) => {
  try {
    const pool = await getPool();
    const { email } = req.query;
    
    let query = `
      SELECT 
        t.ticket_id as ticketId,
        t.price,
        t.status,
        t.booked_at as bookedAt,
        p.first_name + ' ' + p.last_name as ownerName,
        p.email as ownerEmail,
        s.sector_name as sectionFull,
        s.sector_name as sectionShort,
        rt.row_num as row,
        st.seat_id as seatNumber
      FROM Ticket t
      JOIN Person p ON t.user_id = p.user_id
      JOIN Seat st ON t.seat_id = st.seat_id
      JOIN RowTable rt ON st.row_id = rt.row_id
      JOIN Sector s ON rt.sector_id = s.sector_id
    `;
    
    const request = pool.request();
    if (email) {
      query += ' WHERE p.email = @email';
      request.input('email', email);
    }
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('GET /tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.post('/tickets', async (req, res) => {
  let transaction;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    const tx = () => new sql.Request(transaction);

    const { ownerEmail, price, sectionShort, row, seatNumber } = req.body;

    // 1. Get user_id
    const userResult = await tx()
      .input('email', ownerEmail)
      .query('SELECT user_id FROM Person WHERE email = @email');
      
    if (userResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found. Please log in again.' });
    }
    const userId = userResult.recordset[0].user_id;

    // 2. Ensure Sector exists
    const sectorResult = await tx()
      .input('name', sectionShort)
      .query('SELECT sector_id FROM Sector WHERE sector_name = @name');
      
    let sectorId;
    if (sectorResult.recordset.length > 0) {
      sectorId = sectorResult.recordset[0].sector_id;
    } else {
      const sIdRes = await tx().query('SELECT ISNULL(MAX(sector_id), 0) + 1 as newId FROM Sector');
      sectorId = sIdRes.recordset[0].newId;
      await tx()
        .input('id', sectorId)
        .input('name', sectionShort)
        .input('type', 'Standard')
        .input('cap', 1000)
        .input('stad', 1) // default stadium 1
        .query('INSERT INTO Sector (sector_id, sector_name, sector_type, capacity, stadium_id) VALUES (@id, @name, @type, @cap, @stad)');
    }

    // 3. Ensure Row exists. Frontend row is char 'A', 'B'. Convert to int using charCodeAt, or just use identity mapping.
    // DB requires row_num INT. 
    const rowNum = (typeof row === 'string') ? (row.charCodeAt(0) - 64) : parseInt(row);
    const rowResult = await tx()
      .input('sec', sectorId)
      .input('num', rowNum)
      .query('SELECT row_id FROM RowTable WHERE sector_id = @sec AND row_num = @num');
      
    let rowId;
    if (rowResult.recordset.length > 0) {
      rowId = rowResult.recordset[0].row_id;
    } else {
      const rIdRes = await tx().query('SELECT ISNULL(MAX(row_id), 0) + 1 as newId FROM RowTable');
      rowId = rIdRes.recordset[0].newId;
      await tx()
        .input('id', rowId)
        .input('num', rowNum)
        .input('sec', sectorId)
        .query('INSERT INTO RowTable (row_id, row_num, sector_id) VALUES (@id, @num, @sec)');
    }

    // 4. Ensure Seat exists
    // The DB uses seat_id INT as the actual seat number in the row? Yes, the query returned st.seat_id as seatNumber.
    // Wait, the frontend sends seatNumber as string '1', '2'. If multiple sectors have seat 1, seat_id must be unique across entire Seat table.
    // Let's generate a unique seat_id.
    const seatNum = parseInt(seatNumber);
    // Actually we need to check if a seat exists for this row and this 'seat number'. But the Seat table doesn't have a seat_number column!
    // It only has seat_id, status, row_id.
    // So we can assume we just create a new Seat for every ticket, or find one by checking available seats.
    // But since the frontend identifies a seat by 'row' and 'seatNumber', and the backend uses st.seat_id as seatNumber...
    // If the frontend sends seatNumber=5, we can just insert a seat with seat_id = MAX(seat_id)+1, and we have a problem because backend returns st.seat_id as seatNumber.
    // Let's just create a new seat_id. Wait, if we use MAX(seat_id)+1, the frontend will receive a different seat number next time!
    // We should alter Seat table to have seat_num INT. But since we shouldn't change the DB too much, maybe we can just make seat_id = a hash of sector+row+seatNum, or simply just pass seatNum as seat_id.
    // If we pass seatNum as seat_id, it will collide if two tickets have seatNumber 5 in different rows.
    // Let's just make seat_id = (sectorId * 10000) + (rowId * 100) + seatNum.
    const seatId = (sectorId * 10000) + (rowId * 100) + seatNum;
    
    // Check if it exists
    const seatResult = await tx()
      .input('id', seatId)
      .query('SELECT seat_id FROM Seat WHERE seat_id = @id');
      
    if (seatResult.recordset.length === 0) {
      await tx()
        .input('id', seatId)
        .input('rowId', rowId)
        .query("INSERT INTO Seat (seat_id, status, row_id) VALUES (@id, 'Booked', @rowId)");
    } else {
      await tx()
        .input('id', seatId)
        .query("UPDATE Seat SET status = 'Booked' WHERE seat_id = @id");
    }

    // 5. Insert Ticket
    const tIdRes = await tx().query('SELECT ISNULL(MAX(ticket_id), 0) + 1 as newId FROM Ticket');
    const newTicketId = tIdRes.recordset[0].newId;
    
    await tx()
      .input('id', newTicketId)
      .input('price', price)
      .input('event', 1) // default event 1
      .input('seat', seatId)
      .input('user', userId)
      .query("INSERT INTO Ticket (ticket_id, price, status, event_id, seat_id, user_id) VALUES (@id, @price, 'Booked', @event, @seat, @user)");

    // 6. Insert Payment
    const pIdRes = await tx().query('SELECT ISNULL(MAX(payment_id), 0) + 1 as newId FROM Payment');
    const newPaymentId = pIdRes.recordset[0].newId;
    
    await tx()
      .input('id', newPaymentId)
      .input('amount', price)
      .input('tid', newTicketId)
      .query("INSERT INTO Payment (payment_id, amount, payment_method, status, ticket_id) VALUES (@id, @amount, 'Card', 'Paid', @tid)");

    await transaction.commit();

    res.status(201).json({ success: true, ticketId: newTicketId });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch {
        // Ignore rollback errors when the transaction was never started or already completed.
      }
    }
    console.error('POST /tickets error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// GET all requests (Combined view from EmergencyRequest and potentially FoodOrder)
router.get('/requests', async (req, res) => {
  try {
    const pool = await getPool();
    const { email } = req.query;
    
    let query = `
      SELECT 
        CONCAT('assistance-', CAST(er.emergency_id as VARCHAR(50))) as id,
        'assistance' as kind,
        er.type as unitType,
        p.first_name + ' ' + p.last_name as ownerName,
        p.email as ownerEmail,
        er.status,
        er.workflowStatus,
        er.risk,
        er.details,
        er.notes,
        er.source,
        er.requested_at as createdAt,
        er.controlQueuedAt,
        er.assignedUnit,
        er.handledAt,
        er.archivedAt,
        er.lastTouchedAt,
        COALESCE(er.sectionLabel, s.sector_name) as section,
        COALESCE(er.rowLabel, CAST(rt.row_num as VARCHAR(20))) as row,
        COALESCE(er.seatLabel, CAST(st.seat_id as VARCHAR(20))) as seat,
        COALESCE(er.ticketRef, CAST(t.ticket_id as VARCHAR(50))) as ticketId,
        er.liveLatitude,
        er.liveLongitude,
        er.liveAccuracy,
        er.liveCapturedAt,
        er.liveMapX,
        er.liveMapY
      FROM EmergencyRequest er
      JOIN Person p ON er.user_id = p.user_id
      LEFT JOIN Ticket t ON p.user_id = t.user_id
      LEFT JOIN Seat st ON t.seat_id = st.seat_id
      LEFT JOIN RowTable rt ON st.row_id = rt.row_id
      LEFT JOIN Sector s ON rt.sector_id = s.sector_id
      ${email ? 'WHERE p.email = @email' : ''}

      UNION ALL

      SELECT 
        CONCAT('food-', CAST(fo.order_id as VARCHAR(50))) as id,
        'food' as kind,
        'restaurant' as unitType,
        p.first_name + ' ' + p.last_name as ownerName,
        p.email as ownerEmail,
        fo.status,
        CASE
          WHEN fo.archivedAt IS NOT NULL OR LOWER(COALESCE(fo.status, '')) LIKE '%collect%' THEN 'ARCHIVED'
          WHEN fo.handledAt IS NOT NULL OR LOWER(COALESCE(fo.status, '')) LIKE '%ready%' THEN 'DONE'
          WHEN LOWER(COALESCE(fo.status, '')) LIKE '%process%' THEN 'PROCESSING'
          ELSE 'PENDING'
        END as workflowStatus,
        'NORMAL' as risk,
        fi.name as details,
        fo.notes,
        'user-portal' as source,
        fo.requested_at as createdAt,
        fo.controlQueuedAt,
        NULL as assignedUnit,
        fo.handledAt,
        fo.archivedAt,
        COALESCE(fo.archivedAt, fo.handledAt, fo.controlQueuedAt, fo.requested_at) as lastTouchedAt,
        s.sector_name as section,
        CAST(rt.row_num as VARCHAR(20)) as row,
        CAST(st.seat_id as VARCHAR(20)) as seat,
        CAST(t.ticket_id as VARCHAR(50)) as ticketId,
        CAST(NULL as FLOAT) as liveLatitude,
        CAST(NULL as FLOAT) as liveLongitude,
        CAST(NULL as FLOAT) as liveAccuracy,
        CAST(NULL as DATETIME) as liveCapturedAt,
        CAST(NULL as FLOAT) as liveMapX,
        CAST(NULL as FLOAT) as liveMapY
      FROM FoodOrder fo
      JOIN Person p ON fo.user_id = p.user_id
      JOIN FoodItem fi ON fo.item_id = fi.item_id
      LEFT JOIN Ticket t ON p.user_id = t.user_id
      LEFT JOIN Seat st ON t.seat_id = st.seat_id
      LEFT JOIN RowTable rt ON st.row_id = rt.row_id
      LEFT JOIN Sector s ON rt.sector_id = s.sector_id
      ${email ? 'WHERE p.email = @email' : ''}

      ORDER BY createdAt DESC
    `;
    
    const request = pool.request();
    if (email) {
      request.input('email', email);
    }
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {

    console.error('GET /requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});


// POST a new emergency request
router.post('/requests', async (req, res) => {
  try {
    const pool = await getPool();
    const data = req.body;
    
    // 1. Find the user_id from the Person table using email
    const userResult = await pool.request()
      .input('email', data.ownerEmail)
      .query('SELECT user_id FROM Person WHERE email = @email');
    
    let userId = userResult.recordset[0]?.user_id;
    
    // If user doesn't exist, create a temporary Person record
    if (!userId) {
      const idRes = await pool.request().query('SELECT ISNULL(MAX(user_id), 0) + 1 as newId FROM Person');
      const newUserId = idRes.recordset[0].newId;
      const guestName = (data.ownerName || 'Guest').split(' ');
      await pool.request()
        .input('userId', newUserId)
        .input('first', guestName[0] || 'Guest')
        .input('last', guestName.slice(1).join(' ') || '')
        .input('email', data.ownerEmail)
        .input('pass', '123456')
        .query('INSERT INTO Person (user_id, first_name, last_name, email, password) VALUES (@userId, @first, @last, @email, @pass)');
      userId = newUserId;
    }


    // Generate a new emergency_id (no IDENTITY on this table)
    const idResult = await pool.request().query('SELECT ISNULL(MAX(emergency_id), 0) + 1 as newId FROM EmergencyRequest');
    const newId = idResult.recordset[0].newId;

    const query = `
      INSERT INTO EmergencyRequest (
        emergency_id, type, status, workflowStatus, risk, notes, details, source,
        ticketRef, sectionLabel, rowLabel, seatLabel,
        liveLatitude, liveLongitude, liveAccuracy, liveCapturedAt, liveMapX, liveMapY,
        user_id
      ) 
      VALUES (
        @id, @type, @status, @workflowStatus, @risk, @notes, @details, @source,
        @ticketRef, @sectionLabel, @rowLabel, @seatLabel,
        @liveLatitude, @liveLongitude, @liveAccuracy, @liveCapturedAt, @liveMapX, @liveMapY,
        @userId
      )
    `;
    
    await pool.request()
      .input('id', newId)
      .input('type', data.unitType || data.type || '')
      .input('status', data.status || 'Pending')
      .input('workflowStatus', data.workflowStatus || 'PENDING')
      .input('risk', data.risk || 'NORMAL')
      .input('notes', data.notes || '')
      .input('details', data.details || '')
      .input('source', data.source || 'user-portal')
      .input('ticketRef', data.ticketId ? String(data.ticketId) : null)
      .input('sectionLabel', data.section ? String(data.section) : null)
      .input('rowLabel', data.row ? String(data.row) : null)
      .input('seatLabel', data.seat ? String(data.seat) : null)
      .input('liveLatitude', data.liveLatitude ?? null)
      .input('liveLongitude', data.liveLongitude ?? null)
      .input('liveAccuracy', data.liveAccuracy ?? null)
      .input('liveCapturedAt', data.liveCapturedAt || null)
      .input('liveMapX', data.liveMapX ?? null)
      .input('liveMapY', data.liveMapY ?? null)
      .input('userId', userId)
      .query(query);
    
    // Broadcast the new request (Fetch the full joined record)
    const broadcastQuery = `
      SELECT 
        CONCAT('assistance-', CAST(er.emergency_id as VARCHAR(50))) as id,
        'assistance' as kind,
        er.type as unitType,
        p.first_name + ' ' + p.last_name as ownerName,
        p.email as ownerEmail,
        er.status,
        er.workflowStatus,
        er.risk,
        er.details,
        er.notes,
        er.source,
        er.requested_at as createdAt,
        er.controlQueuedAt,
        er.assignedUnit,
        er.handledAt,
        er.archivedAt,
        er.lastTouchedAt,
        COALESCE(er.sectionLabel, s.sector_name) as section,
        COALESCE(er.rowLabel, CAST(rt.row_num as VARCHAR(20))) as row,
        COALESCE(er.seatLabel, CAST(st.seat_id as VARCHAR(20))) as seat,
        COALESCE(er.ticketRef, CAST(t.ticket_id as VARCHAR(50))) as ticketId,
        er.liveLatitude,
        er.liveLongitude,
        er.liveAccuracy,
        er.liveCapturedAt,
        er.liveMapX,
        er.liveMapY
      FROM EmergencyRequest er
      JOIN Person p ON er.user_id = p.user_id
      LEFT JOIN Ticket t ON p.user_id = t.user_id
      LEFT JOIN Seat st ON t.seat_id = st.seat_id
      LEFT JOIN RowTable rt ON st.row_id = rt.row_id
      LEFT JOIN Sector s ON rt.sector_id = s.sector_id
      WHERE er.emergency_id = @id
    `;

    const broadcastResult = await pool.request()
      .input('id', newId)
      .query(broadcastQuery);
      
    if (broadcastResult.recordset.length > 0) {
      const savedReq = broadcastResult.recordset[0];
      broadcastEvent('new-request', savedReq);
      res.status(201).json(savedReq);
    } else {
      res.status(201).json({ ...data, id: newId });
    }
  } catch (err) {
    console.error('POST /requests error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// PUT (update) a request
router.put('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const updates = req.body;
    const parsedRequestId = parseUnifiedRequestId(id);
    const numericId = Number.parseInt(parsedRequestId?.numericId ?? String(id), 10);

    if (!Number.isFinite(numericId)) {
      return res.status(400).json({ error: 'Invalid request id' });
    }

    const request = pool.request().input('id', numericId);
    
    // Determine which table to update
    let tableName = parsedRequestId?.tableName;

    if (!tableName) {
      const typeCheck = await pool.request().input('id', numericId).query(`
        SELECT 'EmergencyRequest' as tbl FROM EmergencyRequest WHERE emergency_id = @id
        UNION
        SELECT 'FoodOrder' as tbl FROM FoodOrder WHERE order_id = @id
      `);

      if (typeCheck.recordset.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      tableName = typeCheck.recordset[0].tbl;
    }

    const idColumn = tableName === 'EmergencyRequest' ? 'emergency_id' : 'order_id';

    // Whitelist of columns that can be updated dynamically
    const allowedColumns = new Set(['status', 'workflowStatus', 'risk', 'notes', 'details', 'source', 'type', 'controlQueuedAt', 'assignedUnit', 'handledAt', 'archivedAt', 'ticketRef', 'sectionLabel', 'rowLabel', 'seatLabel', 'liveLatitude', 'liveLongitude', 'liveAccuracy', 'liveCapturedAt', 'liveMapX', 'liveMapY']);
    const skipKeys = new Set(['id', 'createdAt', 'lastTouchedAt', 'ownerEmail', 'ownerName', 'section', 'row', 'seat', 'ticketId', 'kind', 'unitType', 'title', 'subtitle']);
    
    let setClauses = [];
    if (tableName === 'EmergencyRequest') {
      setClauses.push("lastTouchedAt = GETDATE()");
    }

    for (const [key, value] of Object.entries(updates)) {
      if (skipKeys.has(key) || !allowedColumns.has(key)) continue;
      
      request.input(key, value);
      setClauses.push(`${key} = @${key}`);
    }
    
    const query = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE ${idColumn} = @id`;
    await request.query(query);

    // Fetch the updated record from the table that was actually modified.
    const broadcastQuery = tableName === 'EmergencyRequest'
      ? `
          SELECT 
            CONCAT('assistance-', CAST(er.emergency_id as VARCHAR(50))) as id, 'assistance' as kind, er.type as unitType,
            p.first_name + ' ' + p.last_name as ownerName, p.email as ownerEmail,
            er.status, er.workflowStatus, er.risk, er.details, er.notes, er.source,
            er.requested_at as createdAt, er.controlQueuedAt, er.assignedUnit,
            er.handledAt, er.archivedAt, er.lastTouchedAt,
            COALESCE(er.sectionLabel, s.sector_name) as section,
            COALESCE(er.rowLabel, CAST(rt.row_num as VARCHAR(20))) as row,
            COALESCE(er.seatLabel, CAST(st.seat_id as VARCHAR(20))) as seat,
            COALESCE(er.ticketRef, CAST(t.ticket_id as VARCHAR(50))) as ticketId,
            er.liveLatitude,
            er.liveLongitude,
            er.liveAccuracy,
            er.liveCapturedAt,
            er.liveMapX,
            er.liveMapY
          FROM EmergencyRequest er
          JOIN Person p ON er.user_id = p.user_id
          LEFT JOIN Ticket t ON p.user_id = t.user_id
          LEFT JOIN Seat st ON t.seat_id = st.seat_id
          LEFT JOIN RowTable rt ON st.row_id = rt.row_id
          LEFT JOIN Sector s ON rt.sector_id = s.sector_id
          WHERE er.emergency_id = @id
        `
      : `
          SELECT 
            CONCAT('food-', CAST(fo.order_id as VARCHAR(50))) as id, 'food' as kind, 'restaurant' as unitType,
            p.first_name + ' ' + p.last_name as ownerName, p.email as ownerEmail,
            fo.status,
            CASE
              WHEN fo.archivedAt IS NOT NULL OR LOWER(COALESCE(fo.status, '')) LIKE '%collect%' THEN 'ARCHIVED'
              WHEN fo.handledAt IS NOT NULL OR LOWER(COALESCE(fo.status, '')) LIKE '%ready%' THEN 'DONE'
              WHEN LOWER(COALESCE(fo.status, '')) LIKE '%process%' THEN 'PROCESSING'
              ELSE 'PENDING'
            END as workflowStatus,
            'NORMAL' as risk,
            fi.name as details, fo.notes, 'user-portal' as source,
            fo.requested_at as createdAt, fo.controlQueuedAt, NULL as assignedUnit,
            fo.handledAt, fo.archivedAt,
            COALESCE(fo.archivedAt, fo.handledAt, fo.controlQueuedAt, fo.requested_at) as lastTouchedAt,
            s.sector_name as section,
            CAST(rt.row_num as VARCHAR(20)) as row,
            CAST(st.seat_id as VARCHAR(20)) as seat,
            CAST(t.ticket_id as VARCHAR(50)) as ticketId,
            CAST(NULL as FLOAT) as liveLatitude,
            CAST(NULL as FLOAT) as liveLongitude,
            CAST(NULL as FLOAT) as liveAccuracy,
            CAST(NULL as DATETIME) as liveCapturedAt,
            CAST(NULL as FLOAT) as liveMapX,
            CAST(NULL as FLOAT) as liveMapY
          FROM FoodOrder fo
          JOIN Person p ON fo.user_id = p.user_id
          JOIN FoodItem fi ON fo.item_id = fi.item_id
          LEFT JOIN Ticket t ON p.user_id = t.user_id
          LEFT JOIN Seat st ON t.seat_id = st.seat_id
          LEFT JOIN RowTable rt ON st.row_id = rt.row_id
          LEFT JOIN Sector s ON rt.sector_id = s.sector_id
          WHERE fo.order_id = @id
        `;

    const broadcastResult = await pool.request()
      .input('id', numericId)
      .query(broadcastQuery);
      
    if (broadcastResult.recordset.length > 0) {
      const updatedReq = broadcastResult.recordset[0];
      broadcastEvent('update-request', updatedReq);
      res.json(updatedReq);
    } else {
      res.status(404).json({ error: 'Request not found' });
    }
  } catch (err) {
    console.error('PUT /requests/:id error:', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});


router.post('/food-orders', async (req, res) => {
  try {
    const pool = await getPool();
    const { email, items, notes } = req.body;
    
    // 1. Find user
    const userResult = await pool.request()
      .input('email', email)
      .query('SELECT user_id FROM Person WHERE email = @email');
    
    let userId = userResult.recordset[0]?.user_id;
    if (!userId) return res.status(404).json({ error: 'User not found' });

    // 2. Insert orders
    for (const item of items) {
      // Find item_id from FoodItem table if needed, or assume item.id is the ID
      // The user's FoodItem table has item_id INT.
      // Our frontend uses 'm1', 'm2'. We need to map them or ensure DB has them.
      
      const itemId = parseInt(item.id.replace(/\D/g, '')) || 1; // Fallback to 1

      // Generate a new order_id (no IDENTITY on this table)
      const oIdRes = await pool.request().query('SELECT ISNULL(MAX(order_id), 0) + 1 as newId FROM FoodOrder');
      const newOrderId = oIdRes.recordset[0].newId;

      await pool.request()
        .input('orderId', newOrderId)
        .input('userId', userId)
        .input('itemId', itemId)
        .input('notes', notes || '')
        .query('INSERT INTO FoodOrder (order_id, user_id, item_id, notes, status) VALUES (@orderId, @userId, @itemId, @notes, \'Pending\')');

      // Fetch the order for broadcast
      const orderRes = await pool.request()
        .input('id', newOrderId)
        .query(`
          SELECT 
            CONCAT('food-', CAST(fo.order_id as VARCHAR(50))) as id, 'food' as kind, 'restaurant' as unitType,
            p.first_name + ' ' + p.last_name as ownerName, p.email as ownerEmail,
            fo.status, 'PENDING' as workflowStatus, 'NORMAL' as risk,
            fi.name as details, fo.notes, 'user-portal' as source,
            fo.requested_at as createdAt, fo.controlQueuedAt, NULL as assignedUnit,
            fo.handledAt, fo.archivedAt, GETDATE() as lastTouchedAt,
            s.sector_name as section, rt.row_num as row, st.seat_id as seat,
            t.ticket_id as ticketId
          FROM FoodOrder fo
          JOIN Person p ON fo.user_id = p.user_id
          JOIN FoodItem fi ON fo.item_id = fi.item_id
          LEFT JOIN Ticket t ON p.user_id = t.user_id
          LEFT JOIN Seat st ON t.seat_id = st.seat_id
          LEFT JOIN RowTable rt ON st.row_id = rt.row_id
          LEFT JOIN Sector s ON rt.sector_id = s.sector_id
          WHERE fo.order_id = @id
        `);
      
      if (orderRes.recordset.length > 0) {
        broadcastEvent('new-request', orderRes.recordset[0]);
      }
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('POST /food-orders error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

export default router;

