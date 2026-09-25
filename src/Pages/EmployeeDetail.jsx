import "./EmployeeDetail.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";

const API_URL = "http://localhost:3001/employees";
const PAYROLL_API_URL = "http://localhost:3001/payrolls";

const PAYROLL_STORAGE_KEY = "employee_payrolls";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getPeriodKey = (payroll) => `${payroll.month}-${Number(payroll.year)}`;

// =====================================================
// EMPLOYEE DETAIL COMPONENT
// =====================================================

const EmployeeDetail = () => {
  const { employeesId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // PAYSLIP STATES
  // =====================================================

  const [showPayslip, setShowPayslip] = useState(false);

  const [payrolls, setPayrolls] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollError, setPayrollError] = useState("");

  const [selectedPeriod, setSelectedPeriod] = useState("");

  // =====================================================
  // FETCH EMPLOYEE
  // =====================================================

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}?employeesId=${encodeURIComponent(employeesId)}`,
        );

        if (!response.ok) {
          throw new Error("Employee not found");
        }

        const data = await response.json();

        if (!data.length) {
          throw new Error("Employee not found");
        }

        setEmployee(data[0]);
      } catch (error) {
        console.error("Error fetching employee:", error);
        setError("Unable to load employee details.");
      } finally {
        setLoading(false);
      }
    };

    if (employeesId) {
      fetchEmployee();
    }
  }, [employeesId]);

  // =====================================================
  // LOAD EMPLOYEE PAYROLLS
  // =====================================================

  useEffect(() => {
    if (!employee) return;

    const loadPayrolls = async () => {
      setPayrollLoading(true);
      setPayrollError("");

      let serverPayrolls = [];

      // =====================================================
      // GET PAYROLLS FROM JSON SERVER
      // =====================================================

      try {
        const response = await fetch(PAYROLL_API_URL);

        if (response.ok) {
          const data = await response.json();

          serverPayrolls = Array.isArray(data) ? data : [];
        }
      } catch (error) {
        console.log("JSON Server payrolls unavailable.");
      }

      // =====================================================
      // GET PAYROLLS FROM LOCAL STORAGE
      // =====================================================

      let localPayrolls = [];

      try {
        const stored = localStorage.getItem(PAYROLL_STORAGE_KEY);

        const parsed = stored ? JSON.parse(stored) : [];

        localPayrolls = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Could not read local payrolls:", error);
      }

      // =====================================================
      // MERGE PAYROLLS
      // =====================================================

      const payrollMap = new Map();

      [...serverPayrolls, ...localPayrolls].forEach((item) => {
        payrollMap.set(
          `${String(item.employeeId)}-${item.month}-${Number(item.year)}`,
          item,
        );
      });

      // =====================================================
      // FILTER PAYROLLS FOR CURRENT EMPLOYEE
      // =====================================================

      const employeePayrolls = Array.from(payrollMap.values()).filter(
        (item) =>
          String(item.employeeId) === String(employee.id) ||
          (item.employeesId &&
            String(item.employeesId).toLowerCase() ===
              String(employee.employeesId).toLowerCase()),
      );

      // =====================================================
      // SORT NEWEST FIRST
      // =====================================================

      employeePayrolls.sort((a, b) => {
        if (Number(b.year) !== Number(a.year)) {
          return Number(b.year) - Number(a.year);
        }

        return months.indexOf(b.month) - months.indexOf(a.month);
      });

      setPayrolls(employeePayrolls);
      setPayrollLoading(false);
    };

    loadPayrolls();
  }, [employee]);

  // =====================================================
  // FORMAT CURRENCY
  // =====================================================

  const formatCurrency = (amount) => {
    const value =
      Number(
        String(amount ?? "")
          .replace(/GHS/gi, "")
          .replace(/,/g, "")
          .replace(/[^0-9.-]/g, ""),
      ) || 0;

    return `GHS ${value.toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // =====================================================
  // VIEW PAYSLIP
  // =====================================================

  const handleViewPayslip = (periodKey) => {
    if (!employee) return;

    const key =
      typeof periodKey === "string"
        ? periodKey
        : payrolls.length > 0
          ? getPeriodKey(payrolls[0])
          : "";

    setSelectedPeriod(key);

    setPayrollError(
      payrolls.length === 0
        ? "No payroll has been generated for this employee yet."
        : "",
    );

    setShowPayslip(true);
  };

  // =====================================================
  // CLOSE PAYSLIP
  // =====================================================

  const closePayslip = () => {
    setShowPayslip(false);
    setPayrollError("");
  };

  // =====================================================
  // PRINT PAYSLIP
  // =====================================================

  const handlePrint = () => {
    if (!payroll) return;

    const printWindow = window.open("", "_blank", "width=900,height=800");

    if (!printWindow) {
      alert("Please allow pop-ups to print the payslip.");
      return;
    }

    const employeeName =
      `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
      "Employee";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${employeeName}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 30px;
              font-family: Arial, Helvetica, sans-serif;
              color: #1e293b;
              background: #ffffff;
            }

            .payslip {
              width: 100%;
              max-width: 850px;
              margin: 0 auto;
              border: 1px solid #dbe2e8;
              border-radius: 12px;
              overflow: hidden;
              background: #ffffff;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 25px;
              border-bottom: 2px solid #094f39;
            }

            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #094f39;
            }

            .header p {
              margin: 6px 0 0;
              color: #64748b;
            }

            .employee-info {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              padding: 20px 25px;
              background: #f8fafc;
            }

            .employee-info div {
              display: flex;
              flex-direction: column;
              gap: 5px;
            }

            .employee-info span {
              font-size: 12px;
              color: #64748b;
            }

            .employee-info strong {
              font-size: 14px;
              color: #1e293b;
            }

            .period {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 16px 25px;
              border-bottom: 1px solid #e2e8f0;
            }

            .period span {
              color: #64748b;
            }

            .period strong {
              color: #094f39;
            }

            .section {
              padding: 20px 25px 0;
            }

            .section h3 {
              margin: 0 0 12px;
              font-size: 16px;
              color: #094f39;
            }

            .row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #e2e8f0;
            }

            .row span {
              color: #64748b;
            }

            .row strong {
              color: #1e293b;
            }

            .row-total {
              font-weight: 700;
              background: #f8fafc;
              padding-left: 12px;
              padding-right: 12px;
            }

            .net {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 25px;
              padding: 20px;
              border-radius: 10px;
              background: #094f39;
              color: #ffffff;
            }

            .net span {
              font-size: 15px;
              font-weight: 700;
            }

            .net strong {
              font-size: 22px;
            }

            @media print {
              body {
                padding: 0;
              }

              .payslip {
                max-width: none;
                border: none;
                border-radius: 0;
              }
            }
          </style>
        </head>

        <body>

          <div class="payslip">

            <div class="header">

              <div>
                <h1>PaySlip Management System</h1>
                <p>Employee Payslip</p>
              </div>

              <div>
                <strong>
                  ${payroll.month} ${payroll.year}
                </strong>
              </div>

            </div>

            <div class="employee-info">

              <div>
                <span>Employee</span>
                <strong>${employeeName}</strong>
              </div>

              <div>
                <span>Employee ID</span>
                <strong>
                  ${employee.employeesId ?? "-"}
                </strong>
              </div>

              <div>
                <span>Department</span>
                <strong>
                  ${employee.department ?? "-"}
                </strong>
              </div>

              <div>
                <span>Position</span>
                <strong>
                  ${employee.position ?? "-"}
                </strong>
              </div>

            </div>

            <div class="period">

              <span>Pay Period</span>

              <strong>
                ${payroll.month} ${payroll.year}
              </strong>

            </div>

            <div class="section">

              <h3>Earnings</h3>

              <div class="row">
                <span>Monthly Salary</span>

                <strong>
                  ${formatCurrency(payroll.monthlySalary)}
                </strong>
              </div>

              <div class="row">
                <span>Allowances</span>

                <strong>
                  ${formatCurrency(payroll.allowances)}
                </strong>
              </div>

              <div class="row row-total">
                <span>Gross Salary</span>

                <strong>
                  ${formatCurrency(payroll.grossSalary)}
                </strong>
              </div>

            </div>

            <div class="section">

              <h3>Deductions</h3>

              <div class="row">
                <span>SSNIT</span>

                <strong>
                  ${formatCurrency(payroll.ssnit)}
                </strong>
              </div>

              <div class="row">
                <span>PAYE Tax</span>

                <strong>
                  ${formatCurrency(payroll.payeTax)}
                </strong>
              </div>

              <div class="row">
                <span>Other Deductions</span>

                <strong>
                  ${formatCurrency(payroll.otherDeductions)}
                </strong>
              </div>

              <div class="row row-total">
                <span>Total Deductions</span>

                <strong>
                  ${formatCurrency(payroll.totalDeductions)}
                </strong>
              </div>

            </div>

            <div class="net">

              <span>NET SALARY</span>

              <strong>
                ${formatCurrency(payroll.netSalary)}
              </strong>

            </div>

          </div>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };

            window.onafterprint = function () {
              window.close();
            };
          </script>

        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // =====================================================
  // BACK
  // =====================================================

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/employees");
    }
  };

  // =====================================================
  // ESC KEY
  // =====================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closePayslip();
      }
    };

    if (showPayslip) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showPayslip]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="employee-details-page">
        <p>Loading employee details...</p>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error || !employee) {
    return (
      <div className="employee-details-page">
        <p>{error || "Employee not found."}</p>

        <button type="button" onClick={() => navigate("/employees")}>
          Back to Employees
        </button>
      </div>
    );
  }

  // =====================================================
  // CURRENT PAYROLL
  // =====================================================

  const payroll =
    payrolls.find((item) => getPeriodKey(item) === selectedPeriod) || null;

  // =====================================================
  // PAYSLIP MODAL
  // =====================================================

  const payslipModal =
    showPayslip &&
    createPortal(
      <div
        className="payslip-modal-root"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closePayslip();
          }
        }}
      >
        <div
          className="payslip-modal-box"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {/* MODAL HEADER */}

          <div className="payslip-modal-header">
            <div>
              <h1>PaySlip Management System</h1>

              <p>Employee Payslip</p>
            </div>

            <button
              type="button"
              className="payslip-modal-close"
              onClick={closePayslip}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* LOADING */}

          {payrollLoading && (
            <div className="payslip-modal-loading">
              <div className="payslip-spinner"></div>

              <p>Loading payslip...</p>
            </div>
          )}

          {/* NO PAYROLL */}

          {!payrollLoading && payrolls.length === 0 && (
            <div className="payslip-no-data">
              <div className="payslip-no-data-icon">
                <i className="fa-solid fa-file-circle-exclamation"></i>
              </div>

              <h3>No Payroll Found</h3>

              <p>
                {payrollError ||
                  "No payroll has been generated for this employee yet."}
              </p>

              <button
                type="button"
                onClick={() => {
                  closePayslip();
                  navigate("/payslip");
                }}
              >
                Go to Payslips
              </button>
            </div>
          )}

          {/* PERIOD SELECT */}

          {!payrollLoading && payrolls.length > 0 && (
            <div className="payslip-period-select">
              <label htmlFor="payslip-period">Select month</label>

              <select
                id="payslip-period"
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
              >
                {payrolls.map((item) => (
                  <option key={getPeriodKey(item)} value={getPeriodKey(item)}>
                    {item.month} {item.year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PAYSLIP */}

          {!payrollLoading && payroll && (
            <>
              {/* EMPLOYEE INFORMATION */}

              <div className="payslip-employee-info">
                <div>
                  <span>Employee</span>

                  <strong>
                    {employee.firstName} {employee.lastName}
                  </strong>
                </div>

                <div>
                  <span>Employee ID</span>

                  <strong>{employee.employeesId}</strong>
                </div>

                <div>
                  <span>Department</span>

                  <strong>{employee.department}</strong>
                </div>

                <div>
                  <span>Position</span>

                  <strong>{employee.position}</strong>
                </div>
              </div>

              {/* PAY PERIOD */}

              <div className="payslip-period">
                <span>Pay Period</span>

                <strong>
                  {payroll.month} {payroll.year}
                </strong>
              </div>

              {/* EARNINGS */}

              <div className="payslip-section">
                <h3>Earnings</h3>

                <div className="payslip-row">
                  <span>Monthly Salary</span>

                  <strong>{formatCurrency(payroll.monthlySalary)}</strong>
                </div>

                <div className="payslip-row">
                  <span>Allowances</span>

                  <strong>{formatCurrency(payroll.allowances)}</strong>
                </div>

                <div className="payslip-row payslip-total">
                  <span>Gross Salary</span>

                  <strong>{formatCurrency(payroll.grossSalary)}</strong>
                </div>
              </div>

              {/* DEDUCTIONS */}

              <div className="payslip-section">
                <h3>Deductions</h3>

                <div className="payslip-row">
                  <span>SSNIT</span>

                  <strong>{formatCurrency(payroll.ssnit)}</strong>
                </div>

                <div className="payslip-row">
                  <span>PAYE Tax</span>

                  <strong>{formatCurrency(payroll.payeTax)}</strong>
                </div>

                <div className="payslip-row">
                  <span>Other Deductions</span>

                  <strong>{formatCurrency(payroll.otherDeductions)}</strong>
                </div>

                <div className="payslip-row payslip-total">
                  <span>Total Deductions</span>

                  <strong>{formatCurrency(payroll.totalDeductions)}</strong>
                </div>
              </div>

              {/* NET SALARY */}

              <div className="payslip-net">
                <span>NET SALARY</span>

                <strong>{formatCurrency(payroll.netSalary)}</strong>
              </div>

              {/* ACTIONS */}

              <div className="payslip-actions">
                <button
                  type="button"
                  className="payslip-print-btn"
                  onClick={handlePrint}
                >
                  <i className="fa-solid fa-print"></i>
                  Print Payslip
                </button>

                <button
                  type="button"
                  className="payslip-close-btn"
                  onClick={closePayslip}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>,
      document.body,
    );

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <>
      <div className="employee-details-page">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="employee-details-header">
          <button type="button" className="back-btn" onClick={handleBack}>
            ← Back
          </button>

          <h1>Employee Details</h1>

          <p>View employee biodata and employment information.</p>
        </div>

        {/* =====================================================
            PROFILE
        ===================================================== */}

        <div className="employee-profile-card">
          <div className="employee-avatar">
            {employee.firstName?.charAt(0).toUpperCase()}

            {employee.lastName?.charAt(0).toUpperCase()}
          </div>

          <div className="employee-profile-info">
            <h2>
              {employee.firstName} {employee.lastName}
            </h2>

            <p>{employee.position}</p>

            <span>Employee ID: {employee.employeesId}</span>
          </div>

          <button
            type="button"
            className="view-employee-payslip-btn"
            onClick={() => handleViewPayslip()}
          >
            <i className="fa-solid fa-file-invoice"></i>
            View Payslip
          </button>
        </div>

        {/* =====================================================
            PERSONAL INFORMATION
        ===================================================== */}

        <div className="details-card">
          <h2>Personal Information</h2>

          <div className="details-grid">
            <div className="detail-item">
              <label>First Name</label>

              <p>{employee.firstName}</p>
            </div>

            <div className="detail-item">
              <label>Last Name</label>

              <p>{employee.lastName}</p>
            </div>

            <div className="detail-item">
              <label>Email</label>

              <p>{employee.email}</p>
            </div>

            <div className="detail-item">
              <label>Phone</label>

              <p>{employee.phone}</p>
            </div>
          </div>
        </div>

        {/* =====================================================
            EMPLOYMENT INFORMATION
        ===================================================== */}

        <div className="details-card">
          <h2>Employment Information</h2>

          <div className="details-grid">
            <div className="detail-item">
              <label>Employee ID</label>

              <p>{employee.employeesId}</p>
            </div>

            <div className="detail-item">
              <label>Department</label>

              <p>{employee.department}</p>
            </div>

            <div className="detail-item">
              <label>Position</label>

              <p>{employee.position}</p>
            </div>

            <div className="detail-item">
              <label>Basic Salary</label>

              <p>{formatCurrency(employee.basicSalary)}</p>
            </div>

            <div className="detail-item">
              <label>Monthly Salary</label>

              <p>
                {formatCurrency(
                  employee.monthlySalary ?? employee.basicSalary ?? 0,
                )}
              </p>
            </div>

            <div className="detail-item">
              <label>Net Salary</label>

              <p>{formatCurrency(employee.netSalary ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* =====================================================
            SYSTEM INFORMATION
        ===================================================== */}

        <div className="details-card">
          <h2>System Information</h2>

          <div className="details-grid">
            <div className="detail-item">
              <label>System ID</label>

              <p>{employee.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          PAYSLIP MODAL
      ===================================================== */}

      {payslipModal}
    </>
  );
};

export default EmployeeDetail;
