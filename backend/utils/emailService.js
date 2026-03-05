const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendPendingApprovalNotification(director, transaction) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: director.email,
        subject: `Pending Approval: ${transaction.type} - ₹${transaction.amount}`,
        html: `
          <h2>Pending Approval Required</h2>
          <p>A new ${transaction.type} requires your approval:</p>
          <ul>
            <li><strong>Type:</strong> ${transaction.type}</li>
            <li><strong>Amount:</strong> ₹${transaction.amount.toFixed(2)}</li>
            <li><strong>Date:</strong> ${new Date(transaction.date).toLocaleDateString()}</li>
            <li><strong>Description:</strong> ${transaction.description}</li>
            <li><strong>Reference:</strong> ${transaction.referenceNumber}</li>
          </ul>
          <p><a href="${process.env.APP_URL}/approvals">View Pending Approvals</a></p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Pending approval notification sent to', director.email);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendHighValueTransactionAlert(director, transaction) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: director.email,
        subject: `⚠️ High Value Transaction Alert - ₹${transaction.amount}`,
        html: `
          <h2>High Value Transaction Alert</h2>
          <p>A high-value transaction has been recorded:</p>
          <ul>
            <li><strong>Type:</strong> ${transaction.type}</li>
            <li><strong>Amount:</strong> ₹${transaction.amount.toFixed(2)}</li>
            <li><strong>Date:</strong> ${new Date(transaction.date).toLocaleDateString()}</li>
            <li><strong>Description:</strong> ${transaction.description}</li>
            <li><strong>Status:</strong> ${transaction.status}</li>
          </ul>
          <p><a href="${process.env.APP_URL}/transactions/${transaction._id}">View Transaction</a></p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('High value transaction alert sent to', director.email);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendFeeCollectionReceipt(student, feeCollection) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: student.email,
        subject: `Fee Receipt - ${feeCollection.feeType}`,
        html: `
          <h2>Fee Collection Receipt</h2>
          <p>Dear ${student.name},</p>
          <p>Your fee has been successfully collected:</p>
          <ul>
            <li><strong>Receipt No:</strong> ${feeCollection.receiptNumber}</li>
            <li><strong>Fee Type:</strong> ${feeCollection.feeType}</li>
            <li><strong>Amount:</strong> ₹${feeCollection.amount.toFixed(2)}</li>
            <li><strong>Payment Mode:</strong> ${feeCollection.paymentMode}</li>
            <li><strong>Date:</strong> ${new Date(feeCollection.date).toLocaleDateString()}</li>
          </ul>
          <p>Thank you for your payment.</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Fee receipt sent to', student.email);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendPayslip(employee, payroll) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: employee.email,
        subject: `Payslip - ${payroll.month}`,
        html: `
          <h2>Salary Slip</h2>
          <p>Dear ${payroll.employeeName},</p>
          <p>Your salary slip for ${payroll.month} is ready:</p>
          <ul>
            <li><strong>Base Salary:</strong> ₹${payroll.baseSalary.toFixed(2)}</li>
            <li><strong>Allowances:</strong> ₹${payroll.allowances.toFixed(2)}</li>
            <li><strong>Deductions:</strong> ₹${payroll.deductions.toFixed(2)}</li>
            <li><strong>Net Salary:</strong> ₹${payroll.netSalary.toFixed(2)}</li>
          </ul>
          <p>Your salary will be credited to your account on the scheduled date.</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Payslip sent to', employee.email);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendFinancialReport(director, report) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: director.email,
        subject: `Financial Report - ${report.title}`,
        html: `
          <h2>${report.title}</h2>
          <p>Dear Director,</p>
          <p>Your requested financial report is attached.</p>
          <p>${report.subtitle}</p>
          <p><a href="${process.env.APP_URL}/reports">View All Reports</a></p>
        `,
        attachments: [
          {
            filename: `${report.title}.pdf`,
            path: report.filepath
          }
        ]
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Financial report sent to', director.email);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendCriticalAlert(director, alert) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: director.email,
        subject: `🚨 CRITICAL ALERT: ${alert.title}`,
        html: `
          <h2 style="color: red;">Critical Alert</h2>
          <p><strong>${alert.title}</strong></p>
          <p>${alert.message}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="color: red;"><a href="${process.env.APP_URL}/dashboard">View Dashboard</a></p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Critical alert sent to', director.email);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
