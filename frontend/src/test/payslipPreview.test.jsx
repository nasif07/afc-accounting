import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import PayslipPreview from "../components/payroll/PayslipPreview";

const orgInfo = {
  orgName: "Alliance Française de Chittagong",
  leaveYearLabel: "July'2026 - June'2027",
  benefitPeriodLabel: "01-07-2024 to 30-06-2026",
  healthFundLabel: "Health Fund (July'24 - June'27)",
  annualLeaveDays: 10,
  sickLeaveDays: 5,
};

const monthlyPayroll = {
  _id: "p1",
  payrollNumber: "PR-2026-0007",
  month: "7",
  year: 2026,
  salaryType: "monthly",
  baseSalary: 19803,
  allowances: 15843,
  bonus: 3961,
  deductions: 417,
  totalEarnings: 39607,
  totalDeductions: 417,
  netSalary: 39190,
  employee: {
    name: "Md. Jahidul Alam",
    employeeCode: "2407015",
    designation: "IT Engineer",
    dateOfJoining: "2024-07-01T00:00:00.000Z",
    bankAccountNumber: "1072717890001",
    bankName: "Brac Bank PLC",
    payScale: 226.98,
    scalePointValue: 129.34,
    monthlyWorkingHours: 114,
    healthFundTotal: 5500,
    lifeFundBalance: 17423,
    retirementBenefitBalance: 28874,
  },
};

describe("PayslipPreview", () => {
  it("prints the employee particulars and the pay period", () => {
    render(<PayslipPreview payroll={monthlyPayroll} orgInfo={orgInfo} />);

    expect(screen.getByText("Pay Slip for July 2026")).toBeInTheDocument();
    expect(screen.getByText("Md. Jahidul Alam")).toBeInTheDocument();
    expect(screen.getByText("2407015")).toBeInTheDocument();
    expect(screen.getByText("IT Engineer")).toBeInTheDocument();
    expect(screen.getByText("Permanent")).toBeInTheDocument();
    expect(screen.getByText("226.98")).toBeInTheDocument();
    expect(screen.getByText("129.34")).toBeInTheDocument();
    expect(screen.getByText("114")).toBeInTheDocument();
  });

  it("shows earnings, deductions and net pay as whole taka", () => {
    render(<PayslipPreview payroll={monthlyPayroll} orgInfo={orgInfo} />);

    expect(screen.getByText("19,803")).toBeInTheDocument();
    expect(screen.getByText("15,843")).toBeInTheDocument();
    expect(screen.getByText("3,961")).toBeInTheDocument();
    expect(screen.getByText("39,607")).toBeInTheDocument();
    expect(screen.getByText("39,190")).toBeInTheDocument();

    const netRow = screen.getByText("Net Pay").closest("tr");
    expect(within(netRow).getByText("39,190")).toBeInTheDocument();
  });

  it("spells the net pay in the slip's taka-first wording", () => {
    render(<PayslipPreview payroll={monthlyPayroll} orgInfo={orgInfo} />);

    expect(
      screen.getByText(/Taka Thirty Nine Thousand One Hundred and Ninety Only/),
    ).toBeInTheDocument();
  });

  it("derives remaining leave from the entitlement in org settings", () => {
    render(
      <PayslipPreview
        payroll={{ ...monthlyPayroll, leavesTaken: 3 }}
        orgInfo={orgInfo}
      />,
    );

    const annualRow = screen.getByText("Annual").closest("tr");
    const cells = within(annualRow).getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toEqual(["Annual", "10", "3", "7"]);
  });

  it("renders without employee or org data", () => {
    render(<PayslipPreview payroll={{ month: "1", year: 2026, baseSalary: 0 }} />);

    expect(screen.getByText("Pay Slip for January 2026")).toBeInTheDocument();
    expect(screen.getByText(/Taka Zero Only/)).toBeInTheDocument();
  });

  it("offers both an archival PDF and an editable Word download", () => {
    const onDownload = vi.fn();
    render(<PayslipPreview payroll={monthlyPayroll} orgInfo={orgInfo} onDownload={onDownload} />);

    fireEvent.click(screen.getByRole("button", { name: /Download Word/ }));
    expect(onDownload).toHaveBeenCalledWith("docx");

    fireEvent.click(screen.getByRole("button", { name: /Download PDF/ }));
    expect(onDownload).toHaveBeenCalledWith("pdf");
  });

  it("shows progress on the format being generated and locks both buttons", () => {
    render(<PayslipPreview payroll={monthlyPayroll} orgInfo={orgInfo} downloading="docx" />);

    expect(screen.getByRole("button", { name: /Generating Word/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Download PDF/ })).toBeDisabled();
  });

  it("switches to the hourly earnings breakdown", () => {
    render(
      <PayslipPreview
        payroll={{ ...monthlyPayroll, salaryType: "hourly", workingDays: 96, hourlyRate: 250 }}
        orgInfo={orgInfo}
      />,
    );

    expect(screen.getByText("Earnings - Salary")).toBeInTheDocument();
    expect(screen.getByText("AFC")).toBeInTheDocument();
    expect(screen.getByText("Paid by the Hour")).toBeInTheDocument();
    expect(screen.getByText("Hours")).toBeInTheDocument();
  });
});
