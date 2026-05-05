-- ========== CREATE DATABASE ==========
CREATE DATABASE SmartStadium;
GO
USE SmartStadium;

-- =========================================
-- ========== CREATE TABLES (DDL) ==========
-- =========================================

-- Table: Person
-- Stores all users in the system
CREATE TABLE Person (
    user_id INT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL DEFAULT '123456'
);

-- Table: Attendee
-- Represents users who attend events
CREATE TABLE Attendee (
    user_id INT PRIMARY KEY,
    emergency_contact VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES Person(user_id)
);

-- Table: Vendor
-- Represents food vendors
CREATE TABLE Vendor (
    user_id INT PRIMARY KEY,
    stall_name VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES Person(user_id)
);

-- Table: Emergency Staff
CREATE TABLE EmergencyStaff (
    user_id INT PRIMARY KEY,
    role VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES Person(user_id)
);

-- Table: Stadium
CREATE TABLE Stadium (
    stadium_id INT PRIMARY KEY,
    name VARCHAR(100),
    address VARCHAR(200),
    total_capacity INT CHECK (total_capacity > 0)
);

-- Table: Event
CREATE TABLE Event (
    event_id INT PRIMARY KEY,
    name VARCHAR(100),
    event_date DATE,
    event_type VARCHAR(50),
    stadium_id INT,
    FOREIGN KEY (stadium_id) REFERENCES Stadium(stadium_id)
);

-- Table: Sector
CREATE TABLE Sector (
    sector_id INT PRIMARY KEY,
    sector_name VARCHAR(50),
    sector_type VARCHAR(50),
    capacity INT CHECK (capacity > 0),
    stadium_id INT,
    FOREIGN KEY (stadium_id) REFERENCES Stadium(stadium_id)
);

-- Table: Row
CREATE TABLE RowTable (
    row_id INT PRIMARY KEY,
    row_num INT,
    sector_id INT,
    FOREIGN KEY (sector_id) REFERENCES Sector(sector_id)
);

CREATE TABLE Seat (
    seat_id INT PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'Available',
    row_id INT,
    FOREIGN KEY (row_id) REFERENCES RowTable(row_id)
);

-- Table: Ticket
CREATE TABLE Ticket (
    ticket_id INT PRIMARY KEY,
    booked_at DATETIME DEFAULT GETDATE(),
    price DECIMAL(10,2) CHECK (price > 0),
    status VARCHAR(20) DEFAULT 'Booked',
    event_id INT,
    seat_id INT,
    user_id INT,
    FOREIGN KEY (event_id) REFERENCES Event(event_id),
    FOREIGN KEY (seat_id) REFERENCES Seat(seat_id),
    FOREIGN KEY (user_id) REFERENCES Attendee(user_id)
);

-- Table: Payment
CREATE TABLE Payment (
    payment_id INT PRIMARY KEY,
    amount DECIMAL(10,2) CHECK (amount > 0),
    payment_date DATE DEFAULT GETDATE(),
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Pending',
    ticket_id INT,
    FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id)
);

-- Table: FoodItem
CREATE TABLE FoodItem (
    item_id INT PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2),
    available BIT DEFAULT 1,
    vendor_id INT,
    FOREIGN KEY (vendor_id) REFERENCES Vendor(user_id)
);

-- Table: FoodOrder
CREATE TABLE FoodOrder (
    order_id INT PRIMARY KEY,
    user_id INT,
    item_id INT,
    status VARCHAR(30) DEFAULT 'Pending',
    notes VARCHAR(MAX) DEFAULT '',
    requested_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Attendee(user_id),
    FOREIGN KEY (item_id) REFERENCES FoodItem(item_id)
);

-- Table: EmergencyRequest
CREATE TABLE EmergencyRequest (
    emergency_id INT PRIMARY KEY,
    requested_at DATETIME DEFAULT GETDATE(),
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    notes VARCHAR(MAX),
    workflowStatus VARCHAR(30) DEFAULT 'PENDING',
    risk VARCHAR(20) DEFAULT 'NORMAL',
    details VARCHAR(MAX) DEFAULT '',
    source VARCHAR(30) DEFAULT 'user-portal',
    lastTouchedAt DATETIME DEFAULT GETDATE(),
    controlQueuedAt DATETIME NULL,
    assignedUnit VARCHAR(50) NULL,
    handledAt DATETIME NULL,
    archivedAt DATETIME NULL,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES Person(user_id)
);

-- Insertion

INSERT INTO Person VALUES 
(1,'konoz','tarek','01011111111','konoz@mail.com', '123456'),
(2,'nareman','shalaan','01022222222','nareman@mail.com', '123456'),
(3,'nour','amr','01033333333','nour@mail.com', '123456'),
(4,'youssef','wafy','01044444444','youssef@mail.com', '123456'),
(5,'hanin','mohamed','01055555555','hanin@mail.com', '123456'),
(6,'ahmed','samer','01066666666','ahmed@mail.com', '123456'),
(7,'mohammed','eid','01077777777','mohammed@mail.com', '123456'),
(8,'andrew','jack','01088888888','andrew@mail.com', '123456'),
(9,'salma','adel','01099999990','salma@mail.com', '123456'),
(10,'mahmoud','hany','01099999991','mahmoud@mail.com', '123456'),
(11,'fatma','ali','01099999992','fatma@mail.com', '123456'),
(12,'khaled','mohsen','01099999993','khaled@mail.com', '123456'),
(13,'rana','ibrahim','01099999994','rana@mail.com', '123456'),
(14,'mostafa','samir','01099999995','mostafa@mail.com', '123456'),
(15,'dina','nabil','01099999996','dina@mail.com', '123456');

-- Attendees
INSERT INTO Attendee VALUES 
(1,'01099999999'),(2,'01088888888'),
(5,'01077777777'),(6,'01066666666'),
(9,'01090000001'),(10,'01090000002');

-- Vendors
INSERT INTO Vendor VALUES (3,'Burger Zone'),(7,'Pizza Corner'),(14,'Drinks Corner');

-- Emergency Staff
INSERT INTO EmergencyStaff VALUES (4,'Doctor'),(8,'Paramedic'),(15,'Security');

-- Stadium
INSERT INTO Stadium VALUES (1,'Cairo Stadium','Nasr City',50000);

-- Event
INSERT INTO Event VALUES (1,'Football Match','2026-05-01','Sport',1);

-- Sector / Row / Seats
INSERT INTO Sector VALUES (1,'A','VIP',1000,1);
INSERT INTO RowTable VALUES (1,1,1);

INSERT INTO Seat VALUES 
(1,'Available',1),(2,'Booked',1),(3,'Booked',1),
(4,'Booked',1),(5,'Booked',1),(6,'Available',1);

-- Tickets
INSERT INTO Ticket VALUES 
(1,GETDATE(),200,'Booked',1,2,1),
(2,GETDATE(),250,'Booked',1,4,2),
(3,GETDATE(),300,'Booked',1,3,5),
(4,GETDATE(),220,'Booked',1,5,9);

-- Payments
INSERT INTO Payment VALUES 
(1,200,'2026-04-25','Card','Paid',1),
(2,250,'2026-04-25','Cash','Paid',2),
(3,300,'2026-04-25','Card','Pending',3),
(4,220,'2026-04-26','Card','Paid',4);

-- Food
INSERT INTO FoodItem VALUES 
(1,'Burger',50,1,3),
(2,'Pizza',80,1,7),
(3,'Cola',20,1,14);

INSERT INTO FoodOrder (order_id, user_id, item_id) VALUES (1,1,1),(2,2,2),(3,9,3);

-- Emergency Requests (from attendees, not staff)
INSERT INTO EmergencyRequest (emergency_id, type, status, notes, user_id) VALUES 
(1,'Medical','Pending','Need help',1),
(2,'Security','Resolved','Handled',6);