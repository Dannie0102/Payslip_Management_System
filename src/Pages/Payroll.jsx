import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Payroll.css";

const API_URL = "http://localhost:3001/employees";
const PAYROLL_API_URL = "http://localhost:3001/payrolls";
const ATTENDANCE_API_URL = "http://localhost:3001/attendance";

const PAYROLL_STORAGE_KEY = "employee_payrolls";
const PAYROLL_INPUT_STORAGE_KEY = "employee_payroll_inputs";

const SSNIT_RATE = 0.13;
const TAX_RATE = 0.055;

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

const parseMoney = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, ""),
  );

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => {
  return `GHS ${parseMoney(value).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getPreviousMonthAndYear = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);

  return {
    month: months[date.getMonth()],
    year: date.getFullYear(),
  };
};

const getStorageData = (key, fallback = {}) => {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error(`Unable to read ${key}:`, error);
    return fallback;
  }
};

const getAttendanceMonthKey = (month, year) => {
  const monthIndex = months.findIndex(
    (item) => item.toLowerCase() === String(month).toLowerCase(),
  );

  return monthIndex >= 0
    ? `${Number(year)}-${String(monthIndex + 1).padStart(2, "0")}`
    : "";
};

const getWorkingDaysInMonth = (month, year) => {
  const monthIndex = months.findIndex(
    (item) => item.toLowerCase() === String(month).toLowerCase(),
  );
  if (monthIndex < 0) return 0;

  const date = new Date(Number(year), monthIndex, 1);
  let count = 0;
  while (date.getMonth() === monthIndex) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) count += 1;
    date.setDate(date.getDate() + 1);
  }
  return count;
};

const getDateOfCredit = (month, year) => {
  const monthIndex = months.findIndex(
    (item) => item.toLowerCase() === String(month).toLowerCase(),
  );

  if (monthIndex < 0) {
    return "-";
  }

  const lastDay = new Date(Number(year), monthIndex + 1, 0);

  return lastDay.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

function Payroll() {
  const navigate = useNavigate();
  const location = useLocation();

  const previousPeriod = getPreviousMonthAndYear();

  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(previousPeriod.month);

  const [selectedYear, setSelectedYear] = useState(previousPeriod.year);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [payrollLoading, setPayrollLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 8;

  /* =====================================================
     FETCH EMPLOYEES
  ===================================================== */

  const fetchEmployees = async () => {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch employees.");
      }

      const data = await response.json();

      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Employee fetch error:", error);
      setError("Unable to load employees.");
    }
  };

  /* =====================================================
     FETCH PAYROLLS
  ===================================================== */

  const fetchPayrolls = async () => {
    try {
      setPayrollLoading(true);

      const response = await fetch(PAYROLL_API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch payrolls.");
      }

      const data = await response.json();

      setPayrolls(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Payroll fetch error:", error);

      const localPayrolls = getStorageData(PAYROLL_STORAGE_KEY, []);

      setPayrolls(
        Array.isArray(localPayrolls)
          ? localPayrolls
          : Object.values(localPayrolls || {}),
      );
    } finally {
      setPayrollLoading(false);
    }
  };

  /* =====================================================
     FETCH ATTENDANCE
  ===================================================== */

  const fetchAttendance = async () => {
    try {
      const response = await fetch(ATTENDANCE_API_URL);
      if (!response.ok) throw new Error("Failed to fetch attendance.");
      const data = await response.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Attendance fetch error:", error);
      setAttendance([]);
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      await Promise.all([fetchEmployees(), fetchPayrolls(), fetchAttendance()]);

      setLoading(false);
    };

    loadData();
  }, []);

  /* =====================================================
     REFRESH AFTER GENERATING PAYROLL
  ===================================================== */

  useEffect(() => {
    if (location.state?.generated) {
      setSuccessMessage(
        location.state.message || "Payroll generated successfully.",
      );

      fetchPayrolls();

      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location.state, location.pathname, navigate]);

  /* =====================================================
     PAYROLL INPUT
  ===================================================== */

  const getPayrollInput = (employee, month, year) => {
    const storage = getStorageData(PAYROLL_INPUT_STORAGE_KEY, {});

    const employeeIds = [
      employee?.employeesId,
      employee?.employeeId,
      employee?.employeeID,
      employee?.id,
      employee,
    ]
      .filter((id) => id !== undefined && id !== null && id !== "")
      .map(String);

    const normalizedMonth = String(month);
    const normalizedYear = Number(year);

    for (const employeeId of employeeIds) {
      const keys = [
        `${employeeId}-${normalizedMonth}-${normalizedYear}`,
        `${employeeId}_${normalizedMonth}_${normalizedYear}`,
      ];

      for (const key of keys) {
        if (storage[key] && typeof storage[key] === "object") {
          return {
            allowance: parseMoney(
              storage[key].allowance ?? storage[key].allowances ?? 0,
            ),
            otherDeduction: parseMoney(
              storage[key].otherDeduction ?? storage[key].otherDeductions ?? 0,
            ),
          };
        }
      }
    }

    return { allowance: 0, otherDeduction: 0 };
  };

  /* =====================================================
     PAYROLL LOOKUP
  ===================================================== */

  const getEmployeePayroll = (employee, month, year) => {
    const employeeIds = [
      employee?.employeesId,
      employee?.employeeId,
      employee?.employeeID,
      employee?.id,
      employee,
    ]
      .filter((id) => id !== undefined && id !== null && id !== "")
      .map(String);

    return payrolls.find((payroll) => {
      const payrollIds = [
        payroll?.employeesId,
        payroll?.employeeId,
        payroll?.employeeID,
        payroll?.id,
      ]
        .filter((id) => id !== undefined && id !== null && id !== "")
        .map(String);

      return (
        employeeIds.some((id) => payrollIds.includes(id)) &&
        String(payroll.month) === String(month) &&
        Number(payroll.year) === Number(year)
      );
    });
  };

  /* =====================================================
     EMPLOYEE NAME
  ===================================================== */

  const getEmployeeName = (employee) => {
    if (!employee) {
      return "Employee";
    }

    const fullName =
      employee.employeeName ||
      employee.name ||
      `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

    return fullName || "Employee";
  };

  /* =====================================================
     CALCULATE PAYROLL
  ===================================================== */

  const calculateEmployeePayroll = (employee) => {
    const employeeId =
      employee.employeesId ??
      employee.employeeId ??
      employee.employeeID ??
      employee.id;

    const input = getPayrollInput(employee, selectedMonth, selectedYear);

    const monthlySalary = parseMoney(
      employee.basicSalary ?? employee.monthlySalary ?? employee.salary ?? 0,
    );

    const attendanceMonth = getAttendanceMonthKey(selectedMonth, selectedYear);
    const employeeIds = [employee.employeesId, employee.employeeId, employee.id]
      .filter((id) => id !== undefined && id !== null)
      .map(String);

    const monthlyAttendance = attendance.filter(
      (record) =>
        employeeIds.includes(String(record.employeeId)) &&
        typeof record.date === "string" &&
        record.date.startsWith(attendanceMonth),
    );

    const presentDays = monthlyAttendance.filter(
      (r) => r.status === "Present",
    ).length;
    const lateDays = monthlyAttendance.filter(
      (r) => r.status === "Late",
    ).length;
    const leaveDays = monthlyAttendance.filter(
      (r) => r.status === "Leave",
    ).length;
    const absentDays = monthlyAttendance.filter(
      (r) => r.status === "Absent",
    ).length;
    const daysWorked = presentDays + lateDays;
    const workingDays = getWorkingDaysInMonth(selectedMonth, selectedYear);
    const dailySalary = workingDays > 0 ? monthlySalary / workingDays : 0;
    const basicSalary = dailySalary * daysWorked;

    const allowance = parseMoney(input.allowance ?? input.allowances ?? 0);
    const otherDeduction = parseMoney(
      input.otherDeduction ?? input.otherDeductions ?? 0,
    );
    const grossSalary = basicSalary + allowance;
    const ssnit = basicSalary * SSNIT_RATE;
    const payeTax = basicSalary * TAX_RATE;
    const totalDeductions = payeTax + otherDeduction;
    const netSalary = grossSalary - totalDeductions;

    return {
      ...employee,
      employeesId: employee.employeesId ?? employee.employeeId ?? employee.id,
      firstName: employee.firstName ?? "",
      lastName: employee.lastName ?? "",
      employeeName: getEmployeeName(employee),
      monthlySalary,
      basicSalary,
      allowance,
      allowances: allowance,
      grossSalary,
      ssnit,
      ssnitRate: 13,
      payeTax,
      payeRate: 5.5,
      otherDeduction,
      otherDeductions: otherDeduction,
      totalDeductions,
      netSalary,
      attendanceMonth,
      workingDays,
      presentDays,
      lateDays,
      leaveDays,
      absentDays,
      daysWorked,
      dailySalary,
      attendanceEarnedSalary: basicSalary,
      month: selectedMonth,
      year: selectedYear,
    };
  };

  /* =====================================================
     FILTERED EMPLOYEES
  ===================================================== */

  const payrollEmployees = useMemo(() => {
    const calculated = employees.map(calculateEmployeePayroll);

    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return calculated;
    }

    return calculated.filter((employee) => {
      const name = employee.employeeName?.toLowerCase().includes(search);

      const employeeId = String(employee.employeesId ?? "")
        .toLowerCase()
        .includes(search);

      const department = String(employee.department ?? "")
        .toLowerCase()
        .includes(search);

      return name || employeeId || department;
    });
  }, [
    employees,
    attendance,
    selectedMonth,
    selectedYear,
    searchTerm,
    payrolls,
  ]);

  /* =====================================================
     PAGINATION
  ===================================================== */

  const totalPages = Math.max(
    1,
    Math.ceil(payrollEmployees.length / itemsPerPage),
  );

  const paginatedEmployees = payrollEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMonth, selectedYear]);

  /* =====================================================
     TOTAL NET SALARY
  ===================================================== */

  const totalNetSalary = useMemo(() => {
    return payrollEmployees.reduce(
      (total, employee) => total + parseMoney(employee.netSalary),
      0,
    );
  }, [payrollEmployees]);

  /* =====================================================
     OPEN PAYSLIP
  ===================================================== */

  const openPayslip = (employee) => {
    const savedPayroll = getEmployeePayroll(
      employee,
      selectedMonth,
      selectedYear,
    );

    if (!savedPayroll) {
      setError(
        `No payroll has been generated for ${getEmployeeName(
          employee,
        )} for ${selectedMonth} ${selectedYear}.`,
      );

      setTimeout(() => {
        setError("");
      }, 4000);

      return;
    }

    setSelectedPayslip({
      ...employee,
      ...savedPayroll,

      employeesId:
        employee.employeesId ?? savedPayroll.employeesId ?? employee.id,

      firstName: employee.firstName ?? savedPayroll.firstName ?? "",

      lastName: employee.lastName ?? savedPayroll.lastName ?? "",

      employeeName:
        getEmployeeName(employee) || savedPayroll.employeeName || "Employee",

      month: savedPayroll.month ?? selectedMonth,

      year: savedPayroll.year ?? selectedYear,

      monthlySalary:
        savedPayroll.monthlySalary ??
        savedPayroll.basicSalary ??
        employee.basicSalary ??
        employee.monthlySalary ??
        0,

      allowances: savedPayroll.allowances ?? savedPayroll.allowance ?? 0,

      otherDeductions:
        savedPayroll.otherDeductions ?? savedPayroll.otherDeduction ?? 0,
    });

    setShowPayslipModal(true);
    setError("");
  };

  /* =====================================================
     OPEN PAYROLL GENERATOR
  ===================================================== */

  const handleOpenPayrollGenerator = () => {
    navigate("/payslip", {
      state: {
        selectedMonth,
        selectedYear,
        openGenerator: true,
      },
    });
  };

  /* =====================================================
     PRINT PAYSLIP
     No inline HTML/CSS here anymore — printing uses the
     on-page .salary-slip markup, styled entirely by the
     @media print rules in Payroll.css.
  ===================================================== */

  const handlePrintPayslip = () => {
    if (!selectedPayslip) {
      return;
    }

    window.print();
  };

  /* =====================================================
     CLOSE PAYSLIP MODAL
  ===================================================== */

  const closePayslipModal = () => {
    setShowPayslipModal(false);
    setSelectedPayslip(null);
  };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="payroll-container">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="payroll-page-header">
        <div>
          <h1>Payroll Management</h1>

          <p>Manage employee payroll, deductions and payslips.</p>
        </div>

        <div className="payroll-header-total">
          <span>Total Net Salary</span>

          <strong>{formatCurrency(totalNetSalary)}</strong>
        </div>
      </div>

      {/* =================================================
          CONTROLS
      ================================================= */}

      <div className="payroll-controls">
        <div className="payroll-period">
          <div className="form-group">
            <label htmlFor="payroll-month">Month</label>

            <select
              id="payroll-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="payroll-year">Year</label>

            <select
              id="payroll-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {[
                selectedYear - 2,
                selectedYear - 1,
                selectedYear,
                selectedYear + 1,
                selectedYear + 2,
              ].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="payroll-search">
            <i className="fa-solid fa-magnifying-glass"></i>

            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            {searchTerm && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          MESSAGES
      ================================================= */}

      {successMessage && (
        <div className="payroll-success">
          <i className="fa-solid fa-circle-check"></i>
          <span>{successMessage}</span>

          <button type="button" onClick={() => setSuccessMessage("")}>
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="payroll-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{error}</span>

          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {/* =================================================
          RATES + GENERATE BUTTONS
      ================================================= */}

      <div className="payroll-rate-info">
        <div className="payroll-rate-cards">
          <div className="rate-card">
            <span>SSNIT Rate</span>
            <strong>13%</strong>
            <small>Calculated but not deducted</small>
          </div>

          <div className="rate-card paye-rate">
            <span>PAYE Tax</span>
            <strong>5.5%</strong>
            <small>Deducted from salary</small>
          </div>
        </div>

        <div className="payroll-actions">
          <button
            type="button"
            className="generate-specific-btn"
            onClick={handleOpenPayrollGenerator}
          >
            <i className="fa-solid fa-file-invoice-dollar"></i>
            Open Payroll Generator
          </button>
        </div>
      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="payroll-table-wrapper">
        {loading || payrollLoading ? (
          <div className="payroll-loading">
            <div className="payroll-spinner"></div>
            <p>Loading payroll...</p>
          </div>
        ) : paginatedEmployees.length === 0 ? (
          <div className="empty-payroll">
            <div className="empty-payroll-icon">
              <i className="fa-solid fa-file-invoice-dollar"></i>
            </div>

            <h3>No Employees Found</h3>

            <p>No employees match the current search or payroll period.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Basic Salary</th>
                    <th>Allowance</th>
                    <th>Gross Salary</th>
                    <th>SSNIT 13%</th>
                    <th>PAYE 5.5%</th>
                    <th>Other Deduction</th>
                    <th>Net Salary</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div className="employee-name-cell">
                          <div className="employee-avatar">
                            {(
                              employee.firstName?.[0] ||
                              employee.employeeName?.[0] ||
                              "E"
                            ).toUpperCase()}
                          </div>

                          <div className="employee-name-info">
                            <strong>{employee.employeeName}</strong>

                            <span>
                              ID: {employee.employeesId ?? employee.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>{employee.department ?? "-"}</td>

                      <td>{formatCurrency(employee.basicSalary)}</td>

                      <td>{formatCurrency(employee.allowance)}</td>

                      <td>
                        <strong>{formatCurrency(employee.grossSalary)}</strong>
                      </td>

                      <td>
                        <span className="ssnit-value">
                          {formatCurrency(employee.ssnit)}
                        </span>
                      </td>

                      <td>
                        <span className="tax-value">
                          {formatCurrency(employee.payeTax)}
                        </span>
                      </td>

                      <td>{formatCurrency(employee.otherDeduction)}</td>

                      <td>
                        <strong className="net-salary">
                          {formatCurrency(employee.netSalary)}
                        </strong>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="view-payslip-btn"
                          onClick={() => openPayslip(employee)}
                        >
                          <i className="fa-solid fa-eye"></i>
                          View Payslip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Page {currentPage} of {totalPages}
                </div>

                <div className="pagination-buttons">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                    Previous
                  </button>

                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={currentPage === page ? "active" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  >
                    Next
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* =====================================================
          PAYSLIP MODAL
      ===================================================== */}

      {showPayslipModal && selectedPayslip && (
        <div
          className="payslip-modal-root"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePayslipModal();
            }
          }}
        >
          <div
            className="payslip-modal-box"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="payslip-modal-header">
              <div>
                <h1>PaySlip Management System</h1>

                <p>Employee Payslip</p>
              </div>

              <button
                type="button"
                className="payslip-modal-close"
                onClick={closePayslipModal}
                aria-label="Close payslip"
              >
                ×
              </button>
            </div>

            {/* ===============================================
                SALARY SLIP — styled entirely from Payroll.css
                (.salary-slip and its children), matching the
                classic printed layout.
            =============================================== */}

            <div className="print-payslip salary-slip">
              {/* TITLE */}
              <div className="salary-slip-title">
                <h1>SALARY SLIP</h1>
              </div>

              {/* EMPLOYEE INFO */}
              <div className="salary-employee-info">
                <div className="salary-info-line">
                  <span>Employee Name:</span>
                  <strong>
                    {selectedPayslip.firstName && selectedPayslip.lastName
                      ? `${selectedPayslip.firstName} ${selectedPayslip.lastName}`
                      : selectedPayslip.employeeName || "Employee"}
                  </strong>
                </div>

                <div className="salary-info-line">
                  <span>Employee ID:</span>
                  <strong>{selectedPayslip.employeesId ?? "-"}</strong>
                </div>

                <div className="salary-info-line">
                  <span>Month:</span>
                  <strong>
                    {selectedPayslip.month ?? selectedMonth}{" "}
                    {selectedPayslip.year ?? selectedYear}
                  </strong>
                </div>
              </div>

              <div className="salary-divider"></div>

              {/* EARNINGS */}
              <div className="salary-section">
                <h2>Earnings:</h2>

                <div className="salary-row">
                  <span>Basic Salary:</span>
                  <strong>
                    {formatCurrency(
                      selectedPayslip.monthlySalary ??
                        selectedPayslip.basicSalary ??
                        0,
                    )}
                  </strong>
                </div>

                {(selectedPayslip.allowances ??
                  selectedPayslip.allowance ??
                  0) > 0 && (
                  <div className="salary-row">
                    <span>Allowance:</span>
                    <strong>
                      {formatCurrency(
                        selectedPayslip.allowances ??
                          selectedPayslip.allowance ??
                          0,
                      )}
                    </strong>
                  </div>
                )}
              </div>

              <div className="salary-divider"></div>

              {/* DEDUCTIONS */}
              <div className="salary-section">
                <h2>Deductions:</h2>

                {(selectedPayslip.totalDeductions ?? 0) === 0 ? (
                  <div className="salary-deduction-none">None</div>
                ) : (
                  <>
                    <div className="salary-row">
                      <span>PAYE Tax:</span>
                      <strong>
                        {formatCurrency(selectedPayslip.payeTax ?? 0)}
                      </strong>
                    </div>

                    {(selectedPayslip.otherDeductions ??
                      selectedPayslip.otherDeduction ??
                      0) > 0 && (
                      <div className="salary-row">
                        <span>Other Deductions:</span>
                        <strong>
                          {formatCurrency(
                            selectedPayslip.otherDeductions ??
                              selectedPayslip.otherDeduction ??
                              0,
                          )}
                        </strong>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="salary-divider"></div>

              {/* NET SALARY */}
              <div className="salary-net">
                <span>Net Salary (Credited):</span>
                <strong>
                  {formatCurrency(selectedPayslip.netSalary ?? 0)}
                </strong>
              </div>

              {/* PAYMENT STATUS */}
              <div className="salary-payment-info">
                <div className="salary-info-line">
                  <span>Payment Status:</span>
                  <strong>Credited</strong>
                </div>

                <div className="salary-info-line">
                  <span>Date of Credit:</span>
                  <strong>
                    {getDateOfCredit(
                      selectedPayslip.month ?? selectedMonth,
                      selectedPayslip.year ?? selectedYear,
                    )}
                  </strong>
                </div>
              </div>

              <div className="salary-divider"></div>

              {/* SIGNATURE */}
              <div className="salary-signature">
                <span>Authorized Signature:</span>
                <span className="signature-line"></span>
              </div>

              {/* NOTE */}
              <div className="salary-note">
                <strong>Note:</strong> This is a system-generated salary slip.
              </div>
            </div>

            {/* ACTIONS */}

            <div className="payslip-actions">
              <button
                type="button"
                className="payslip-print-btn"
                onClick={handlePrintPayslip}
              >
                <i className="fa-solid fa-print"></i>
                Print Payslip
              </button>

              <button
                type="button"
                className="payslip-close-btn"
                onClick={closePayslipModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payroll;
