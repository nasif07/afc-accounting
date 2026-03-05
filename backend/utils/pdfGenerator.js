const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  static generateReceipt(feeCollection, student) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const filename = `receipt-${feeCollection._id}.pdf`;
        const filepath = path.join(__dirname, '../uploads', filename);

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('ALLIANCE SCHOOL', 100, 50);
        doc.fontSize(10).font('Helvetica').text('Fee Receipt', 100, 75);
        doc.moveTo(100, 90).lineTo(500, 90).stroke();

        // Receipt Details
        doc.fontSize(10).text(`Receipt No: ${feeCollection.receiptNumber}`, 100, 110);
        doc.text(`Date: ${new Date(feeCollection.date).toLocaleDateString()}`, 100, 130);

        // Student Details
        doc.fontSize(12).font('Helvetica-Bold').text('Student Details', 100, 160);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Name: ${student.name}`, 100, 180);
        doc.text(`Roll No: ${student.rollNumber}`, 100, 200);
        doc.text(`Class: ${student.class}`, 100, 220);

        // Fee Details
        doc.fontSize(12).font('Helvetica-Bold').text('Fee Details', 100, 260);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Fee Type: ${feeCollection.feeType}`, 100, 280);
        doc.text(`Amount: ₹${feeCollection.amount.toFixed(2)}`, 100, 300);
        doc.text(`Payment Mode: ${feeCollection.paymentMode}`, 100, 320);
        doc.text(`Reference: ${feeCollection.referenceNumber}`, 100, 340);

        // Total
        doc.fontSize(12).font('Helvetica-Bold').text(`Total Amount: ₹${feeCollection.amount.toFixed(2)}`, 100, 380);

        // Footer
        doc.fontSize(8).font('Helvetica').text('This is a computer-generated receipt. No signature required.', 100, 500);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 100, 520);

        doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  static generatePayslip(payroll, employee) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const filename = `payslip-${payroll._id}.pdf`;
        const filepath = path.join(__dirname, '../uploads', filename);

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('ALLIANCE SCHOOL', 100, 50);
        doc.fontSize(10).font('Helvetica').text('Salary Slip', 100, 75);
        doc.moveTo(100, 90).lineTo(500, 90).stroke();

        // Payroll Details
        doc.fontSize(10).text(`Month: ${payroll.month}`, 100, 110);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 100, 130);

        // Employee Details
        doc.fontSize(12).font('Helvetica-Bold').text('Employee Details', 100, 160);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Name: ${payroll.employeeName}`, 100, 180);
        doc.text(`ID: ${payroll.employeeId}`, 100, 200);
        doc.text(`Designation: ${payroll.designation}`, 100, 220);
        doc.text(`Salary Type: ${payroll.salaryType}`, 100, 240);

        // Earnings
        doc.fontSize(12).font('Helvetica-Bold').text('Earnings', 100, 280);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Base Salary: ₹${payroll.baseSalary.toFixed(2)}`, 100, 300);
        doc.text(`Allowances: ₹${payroll.allowances.toFixed(2)}`, 100, 320);
        doc.text(`Bonus: ₹${payroll.bonus.toFixed(2)}`, 100, 340);

        // Deductions
        doc.fontSize(12).font('Helvetica-Bold').text('Deductions', 100, 380);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Deductions: ₹${payroll.deductions.toFixed(2)}`, 100, 400);
        doc.text(`Leave Deduction: ₹${payroll.leaveDeduction.toFixed(2)}`, 100, 420);

        // Net Salary
        doc.fontSize(14).font('Helvetica-Bold').text(`Net Salary: ₹${payroll.netSalary.toFixed(2)}`, 100, 470);

        // Footer
        doc.fontSize(8).font('Helvetica').text('This is a computer-generated payslip. No signature required.', 100, 550);

        doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  static generateFinancialReport(reportType, data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const filename = `${reportType}-${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '../uploads', filename);

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('ALLIANCE SCHOOL', 100, 50);
        doc.fontSize(14).font('Helvetica-Bold').text(data.title, 100, 80);
        doc.fontSize(10).font('Helvetica').text(data.subtitle, 100, 100);
        doc.moveTo(100, 120).lineTo(500, 120).stroke();

        let yPosition = 140;

        // Report Sections
        data.sections.forEach(section => {
          doc.fontSize(12).font('Helvetica-Bold').text(section.name, 100, yPosition);
          yPosition += 25;

          section.items.forEach(item => {
            doc.fontSize(10).font('Helvetica');
            doc.text(item.label, 120, yPosition);
            doc.text(`₹${item.value.toLocaleString()}`, 400, yPosition, { align: 'right' });
            yPosition += 20;
          });

          const total = section.items.reduce((sum, item) => sum + item.value, 0);
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text(`${section.name} Total`, 120, yPosition);
          doc.text(`₹${total.toLocaleString()}`, 400, yPosition, { align: 'right' });
          yPosition += 30;
        });

        // Footer
        doc.fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, 100, 700);

        doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;
