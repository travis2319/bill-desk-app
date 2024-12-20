import { DBHandler } from "./dbHandler";

export class Orders {
   dbHandler;

  constructor(dbHandler) {
    this.dbHandler = dbHandler;
  }

  async createTables() {
    const ordersTableQuery = `
      CREATE TABLE IF NOT EXISTS Orders (
        OrderID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL,
        CustomerId INTEGER NOT NULL,
        OrderTimestamp DATETIME NOT NULL,
        TotalAmount DECIMAL(10,2),
        SubTotal DECIMAL(10,2),
        TaxAmount DECIMAL(10,2),
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
        FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId)
      );
    `;
    try {
      await this.dbHandler.run(ordersTableQuery);
    } catch (err) {
      console.error("Error creating Orders table:", err);
      throw err;
    }
  }

  async createOrder(
    userID,
    customerId,
    orderTimestamp,
    totalAmount,
    subTotal,
    taxAmount
  ) {
    const insertOrderQuery = `
      INSERT INTO Orders (UserID, CustomerId, OrderTimestamp, TotalAmount, SubTotal, TaxAmount)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      // Insert the order
      await this.dbHandler.run(insertOrderQuery, [
        userID,
        customerId,
        orderTimestamp,
        totalAmount,
        subTotal,
        taxAmount,
      ]);

      // Manually fetch the last inserted order ID
      const fetchOrderIDQuery = `
        SELECT OrderID 
        FROM Orders
        WHERE UserID = ? AND CustomerId = ? AND OrderTimestamp = ?
        ORDER BY OrderID DESC
        LIMIT 1
      `;
      const result = await this.dbHandler.get(fetchOrderIDQuery, [
        userID,
        customerId,
        orderTimestamp,
      ]);

      if (!result) {
        throw new Error("Failed to retrieve OrderID after insert.");
      }

      return result.OrderID;
    } catch (err) {
      console.error("Error creating order:", err);
      throw err;
    }
  }

  async getAllOrders() {
    const query = `
      SELECT 
      o.OrderID, 
      c.CustomerID,
      c.CustomerName,
      c.PhoneNumber,
      c.Email,
      o.UserID,
      o.OrderTimestamp, 
      o.TotalAmount, 
      o.SubTotal, 
      o.TaxAmount, 
      group_concat(oi.ItemName, ', ') AS ItemNames,
      group_concat(oi.Quantity, ', ') AS Quantities
      FROM Orders o
      JOIN Customers c ON o.CustomerId = c.CustomerID
      JOIN OrderItems oi ON o.OrderID = oi.OrderID
      GROUP BY o.OrderID, c.CustomerID, c.CustomerName, c.PhoneNumber, c.Email, 
      o.UserID, o.OrderTimestamp, o.TotalAmount, o.SubTotal, o.TaxAmount
      ORDER BY o.OrderID DESC;
    `;
    try {
      return await this.dbHandler.all(query);
    } catch (err) {
      console.error("Error fetching orders:", err);
      throw err;
    }
  }

  async getOrder(orderId) {
    const query = `
      SELECT 
        o.OrderID,
        o.OrderTimestamp,
        c.CustomerName,
        c.Email AS CustomerEmail,
        c.PhoneNumber,
        oi.ItemName,
        oi.Quantity,
        m.Price AS ItemPrice
      FROM Orders o
      JOIN Customers c ON o.CustomerID = c.CustomerID
      LEFT JOIN OrderItems oi ON o.OrderID = oi.OrderID
      LEFT JOIN MenuItems m ON oi.ItemName = m.ItemName
      WHERE o.OrderID = ?`;

    try {
      const rows = await this.dbHandler.all(query, [orderId]);

      if (rows.length > 0) {
        // Transform the result into a more structured format if necessary
        const orderDetails = {
          OrderID: rows[0].OrderID,
          TimeStamp:rows[0].OrderTimestamp,
          CustomerName: rows[0].CustomerName,
          Email: rows[0].CustomerEmail,
          PhoneNumber: rows[0].PhoneNumber,
          Items: rows.map(row => ({
            ItemName: row.ItemName,
            ItemPrice: row.ItemPrice,
            Quantity: row.Quantity,
          })),
        };

        return orderDetails; // Return structured order details
      } else {
        throw new Error("Order not found");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      throw error;
    }
  }
}
