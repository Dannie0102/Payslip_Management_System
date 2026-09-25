import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

// =====================================================
// API
// =====================================================

const EMPLOYEES_API_URL = "http://localhost:3001/employees";
const ATTENDANCE_API_URL = "http://localhost:3001/attendance";
const PAYROLL_API_URL = "http://localhost:3001/payrolls";

// =====================================================
// STORAGE
// =====================================================

const PAYROLL_INPUT_STORAGE_KEY = "employee_payroll_inputs";

// =====================================================
// PAYROLL RATES
// =====================================================

const SSNIT_RATE = 0.13;
const TAX_RATE = 0.055;

// =====================================================
// MONTHS
// =====================================================

const MONTHS = [
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

// =====================================================
// HELPERS
// =====================================================

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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

const formatCurrency = (value) =>
  `GHS ${parseMoney(value).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getEmployeeName = (employee) =>
  `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() ||
  employee?.employeeName ||
  employee?.name ||
  "Employee";

const getEmployeeId = (employee) =>
  employee?.employeesId ?? employee?.employeeId ?? employee?.id;

const getNormalizedStatus = (record) =>
  String(record?.status ?? "")
    .trim()
    .toLowerCase();

// =====================================================
// LOCAL STORAGE
// =====================================================

const getPayrollInputs = () => {
  try {
    const saved = localStorage.getItem(PAYROLL_INPUT_STORAGE_KEY);

    if (!saved) {
      return {};
    }

    const parsed = JSON.parse(saved);

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Unable to read payroll inputs:", error);
    return {};
  }
};

// =====================================================
// WORKING DAYS
// =====================================================

const getWorkingDaysInMonth = (year, monthIndex) => {
  let count = 0;

  const date = new Date(year, monthIndex, 1);

  while (date.getMonth() === monthIndex) {
    const day = date.getDay();

    if (day !== 0 && day !== 6) {
      count += 1;
    }

    date.setDate(date.getDate() + 1);
  }

  return count;
};

// =====================================================
// LAST 7 DAYS
// =====================================================

const getLastSevenDays = () => {
  const days = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();

    date.setDate(date.getDate() - offset);

    days.push({
      key: toDateKey(date),
      label: date.toLocaleDateString("en-GH", {
        weekday: "short",
      }),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    });
  }

  return days;
};

// =====================================================
// LAST 6 MONTHS
// =====================================================

const getLastSixMonths = () => {
  const periods = [];
  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);

    periods.push({
      month: MONTHS[date.getMonth()],
      monthIndex: date.getMonth(),
      year: date.getFullYear(),
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`,
      shortLabel: date.toLocaleDateString("en-GH", {
        month: "short",
      }),
    });
  }

  return periods;
};

// =====================================================
// COMPONENT
// =====================================================

const Dashboard = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payrolls, setPayrolls] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [payrollInputs, setPayrollInputs] = useState({});

  // ===================================================
  // CURRENT DATE
  // ===================================================

  const currentDate = new Date();

  const currentMonth = MONTHS[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const today = toDateKey(currentDate);

  // ===================================================
  // LOAD DATA
  // ===================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [employeesRes, attendanceRes, payrollsRes] = await Promise.all([
          fetch(EMPLOYEES_API_URL),
          fetch(ATTENDANCE_API_URL),
          fetch(PAYROLL_API_URL),
        ]);

        if (!employeesRes.ok) {
          throw new Error("Failed to load employees.");
        }

        if (!attendanceRes.ok) {
          throw new Error("Failed to load attendance.");
        }

        const employeesData = await employeesRes.json();
        const attendanceData = await attendanceRes.json();

        let payrollsData = [];

        if (payrollsRes.ok) {
          payrollsData = await payrollsRes.json();
        }

        setEmployees(Array.isArray(employeesData) ? employeesData : []);

        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);

        setPayrolls(Array.isArray(payrollsData) ? payrollsData : []);

        setPayrollInputs(getPayrollInputs());
      } catch (err) {
        console.error("Dashboard load error:", err);

        setError(
          `${err.message} Make sure JSON Server is running on port 3001.`,
        );

        // Still load local payroll inputs
        setPayrollInputs(getPayrollInputs());
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ===================================================
  // EMPLOYEE STATISTICS
  // ===================================================

  const departments = useMemo(() => {
    const counts = {};

    employees.forEach((employee) => {
      const name = employee.department || "Unassigned";

      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  const largestDepartment = departments[0]?.count || 1;

  const totalBasicSalary = useMemo(() => {
    return employees.reduce((total, employee) => {
      return (
        total +
        parseMoney(
          employee.basicSalary ??
            employee.monthlySalary ??
            employee.salary ??
            0,
        )
      );
    }, 0);
  }, [employees]);

  // ===================================================
  // EXACT PAYROLL CALCULATION
  // Same calculation used by Payroll.jsx
  // ===================================================

  const calculateEmployeePayroll = (employee, month, year) => {
    const employeeId =
      employee.employeesId ?? employee.employeeId ?? employee.id;

    const inputKey = `${employee.id}_${month}_${year}`;

    const input = payrollInputs[inputKey] || {};

    const monthlySalary = parseMoney(
      employee.basicSalary ?? employee.monthlySalary ?? employee.salary ?? 0,
    );

    const monthIndex = MONTHS.findIndex(
      (item) => item.toLowerCase() === String(month).toLowerCase(),
    );

    const attendanceMonth =
      monthIndex >= 0
        ? `${Number(year)}-${String(monthIndex + 1).padStart(2, "0")}`
        : "";

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
      (record) => getNormalizedStatus(record) === "present",
    ).length;

    const lateDays = monthlyAttendance.filter(
      (record) => getNormalizedStatus(record) === "late",
    ).length;

    const leaveDays = monthlyAttendance.filter(
      (record) => getNormalizedStatus(record) === "leave",
    ).length;

    const absentDays = monthlyAttendance.filter(
      (record) => getNormalizedStatus(record) === "absent",
    ).length;

    const daysWorked = presentDays + lateDays;

    const workingDays =
      monthIndex >= 0 ? getWorkingDaysInMonth(Number(year), monthIndex) : 0;

    const dailySalary = workingDays > 0 ? monthlySalary / workingDays : 0;

    const basicSalary = dailySalary * daysWorked;

    const allowance = parseMoney(input.allowance ?? input.allowances ?? 0);

    const otherDeduction = parseMoney(
      input.otherDeduction ?? input.otherDeductions ?? 0,
    );

    const grossSalary = basicSalary + allowance;

    // SSNIT is calculated but NOT deducted
    const ssnit = basicSalary * SSNIT_RATE;

    // PAYE is deducted
    const payeTax = basicSalary * TAX_RATE;

    const totalDeductions = payeTax + otherDeduction;

    const netSalary = grossSalary - totalDeductions;

    return {
      ...employee,

      employeeId,

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

      month,

      year,
    };
  };

  // ===================================================
  // CURRENT MONTH PAYROLL
  // ===================================================

  const currentMonthPayroll = useMemo(() => {
    return employees.map((employee) =>
      calculateEmployeePayroll(employee, currentMonth, currentYear),
    );
  }, [employees, attendance, payrollInputs, currentMonth, currentYear]);

  // ===================================================
  // CURRENT MONTH TOTAL NET PAY
  // THIS IS THE SAME VALUE AS PAYROLL PAGE
  // ===================================================

  const currentTotalNetSalary = useMemo(() => {
    return currentMonthPayroll.reduce(
      (total, employee) => total + parseMoney(employee.netSalary),
      0,
    );
  }, [currentMonthPayroll]);

  // ===================================================
  // LAST 6 MONTHS NET PAY
  // ===================================================

  const sixMonthNetPay = useMemo(() => {
    const periods = getLastSixMonths();

    return periods.map((period) => {
      const employeePayrolls = employees.map((employee) =>
        calculateEmployeePayroll(employee, period.month, period.year),
      );

      const net = employeePayrolls.reduce(
        (total, employee) => total + parseMoney(employee.netSalary),
        0,
      );

      const gross = employeePayrolls.reduce(
        (total, employee) => total + parseMoney(employee.grossSalary),
        0,
      );

      const deductions = employeePayrolls.reduce(
        (total, employee) => total + parseMoney(employee.totalDeductions),
        0,
      );

      return {
        ...period,
        net,
        gross,
        deductions,
        employeeCount: employeePayrolls.length,
      };
    });
  }, [employees, attendance, payrollInputs]);

  // ===================================================
  // MAXIMUM SIX-MONTH NET PAY
  // ===================================================

  const maxSixMonthNet = Math.max(...sixMonthNetPay.map((item) => item.net), 1);

  // ===================================================
  // TODAY'S ATTENDANCE
  // ===================================================

  const todayStats = useMemo(() => {
    const todayRecords = attendance.filter((record) => record.date === today);

    const countStatus = (status) =>
      todayRecords.filter(
        (record) => getNormalizedStatus(record) === status.toLowerCase(),
      ).length;

    const present = countStatus("Present");

    const late = countStatus("Late");

    const leave = countStatus("Leave");

    const absent = employees.filter((employee) => {
      const id = String(getEmployeeId(employee));

      const record = todayRecords.find(
        (item) => String(item.employeeId ?? item.employeesId ?? item.id) === id,
      );

      return !record || getNormalizedStatus(record) === "absent";
    }).length;

    const unmarked = employees.filter((employee) => {
      const id = String(getEmployeeId(employee));

      return !todayRecords.some(
        (item) => String(item.employeeId ?? item.employeesId ?? item.id) === id,
      );
    }).length;

    const rate =
      employees.length > 0
        ? Math.round(((present + late) / employees.length) * 100)
        : 0;

    return {
      present,
      late,
      leave,
      absent,
      unmarked,
      rate,
    };
  }, [attendance, employees, today]);

  // ===================================================
  // LAST 7 DAYS
  // ===================================================

  const weeklyTrend = useMemo(() => {
    return getLastSevenDays().map((day) => {
      const records = attendance.filter((record) => record.date === day.key);

      const attended = records.filter((record) => {
        const status = getNormalizedStatus(record);

        return status === "present" || status === "late";
      }).length;

      const rate =
        employees.length > 0
          ? Math.round((attended / employees.length) * 100)
          : 0;

      return {
        ...day,
        attended,
        rate,
        hasRecords: records.length > 0,
      };
    });
  }, [attendance, employees.length]);

  // ===================================================
  // LAST 6 MONTHS ATTENDANCE
  // ===================================================

  const sixMonthAttendance = useMemo(() => {
    const periods = getLastSixMonths();

    return periods.map((period) => {
      const records = attendance.filter((record) => {
        if (!record.date) {
          return false;
        }

        const date = new Date(record.date);

        return (
          date.getFullYear() === period.year &&
          date.getMonth() === period.monthIndex
        );
      });

      const workingDays = getWorkingDaysInMonth(period.year, period.monthIndex);

      const totalExpected = employees.length * workingDays;

      const attended = records.filter((record) => {
        const status = getNormalizedStatus(record);

        return status === "present" || status === "late";
      }).length;

      const rate =
        totalExpected > 0
          ? Math.min(100, Math.round((attended / totalExpected) * 100))
          : 0;

      return {
        ...period,
        rate,
        attended,
        workingDays,
        hasRecords: records.length > 0,
      };
    });
  }, [attendance, employees.length]);

  // ===================================================
  // LATEST SAVED PAYROLL
  // ===================================================

  const latestPayroll = useMemo(() => {
    if (payrolls.length === 0) {
      return null;
    }

    const getPeriodValue = (payroll) => {
      const monthIndex = MONTHS.findIndex(
        (item) => item.toLowerCase() === String(payroll?.month).toLowerCase(),
      );

      if (monthIndex < 0 || !payroll?.year) {
        return -1;
      }

      return Number(payroll.year) * 12 + monthIndex;
    };

    const latestValue = Math.max(...payrolls.map(getPeriodValue));

    if (latestValue < 0) {
      return null;
    }

    const records = payrolls.filter(
      (payroll) => getPeriodValue(payroll) === latestValue,
    );

    const sum = (field, alternate) =>
      records.reduce(
        (total, payroll) =>
          total + parseMoney(payroll[field] ?? payroll[alternate]),
        0,
      );

    return {
      month: records[0].month,
      year: records[0].year,
      count: records.length,
      gross: sum("grossSalary", "gross"),
      deductions: sum("totalDeductions", "deductions"),
      net: sum("netSalary", "net"),
    };
  }, [payrolls]);

  // ===================================================
  // RECENT PAYSLIPS
  // ===================================================

  const recentPayslips = useMemo(() => {
    return [...payrolls]
      .sort((a, b) => {
        const first = new Date(a.updatedAt || a.generatedAt || 0).getTime();

        const second = new Date(b.updatedAt || b.generatedAt || 0).getTime();

        return second - first;
      })
      .slice(0, 5);
  }, [payrolls]);

  const getEmployeeForPayroll = (payroll) =>
    employees.find((employee) => {
      const employeeId = String(getEmployeeId(employee));

      return (
        employeeId ===
        String(payroll.employeesId ?? payroll.employeeId ?? payroll.id)
      );
    });

  // ===================================================
  // TODAY LABEL
  // ===================================================

  const todayLabel = new Date().toLocaleDateString("en-GH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>

          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="dashboard-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>

          <p>{todayLabel}</p>
        </div>

        <div className="dashboard-header-actions">
          <button
            type="button"
            className="dashboard-btn secondary"
            onClick={() =>
              navigate("/marking", {
                state: {
                  date: today,
                },
              })
            }
          >
            <i className="fa-solid fa-user-check"></i>
            Mark attendance
          </button>

          <button
            type="button"
            className="dashboard-btn primary"
            onClick={() => navigate("/payslip")}
          >
            <i className="fa-solid fa-file-invoice-dollar"></i>
            Generate payroll
          </button>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="dashboard-error">
          <i className="fa-solid fa-circle-exclamation"></i>

          <span>{error}</span>
        </div>
      )}

      {/* =================================================
          MAIN STAT CARDS
      ================================================= */}

      <div className="dashboard-stats">
        {/* EMPLOYEES */}

        <button
          type="button"
          className="dashboard-stat"
          onClick={() => navigate("/employees")}
        >
          <div className="dashboard-stat-icon">
            <i className="fa-solid fa-users"></i>
          </div>

          <div>
            <span>Employees</span>

            <strong>{employees.length}</strong>

            <small>{departments.length} departments</small>
          </div>
        </button>

        {/* PRESENT */}

        <button
          type="button"
          className="dashboard-stat"
          onClick={() => navigate("/attendance")}
        >
          <div className="dashboard-stat-icon present">
            <i className="fa-solid fa-user-check"></i>
          </div>

          <div>
            <span>Present today</span>

            <strong>{todayStats.present + todayStats.late}</strong>

            <small>{todayStats.rate}% attendance rate</small>
          </div>
        </button>

        {/* ABSENT */}

        <button
          type="button"
          className="dashboard-stat"
          onClick={() => navigate("/attendance")}
        >
          <div className="dashboard-stat-icon absent">
            <i className="fa-solid fa-user-xmark"></i>
          </div>

          <div>
            <span>Absent today</span>

            <strong>{todayStats.absent}</strong>

            <small>{todayStats.unmarked} not yet marked</small>
          </div>
        </button>

        {/* CURRENT NET PAY */}

        <button
          type="button"
          className="dashboard-stat"
          onClick={() => navigate("/payroll")}
        >
          <div className="dashboard-stat-icon net">
            <i className="fa-solid fa-wallet"></i>
          </div>

          <div>
            <span>
              Net pay, {currentMonth} {currentYear}
            </span>

            <strong>{formatCurrency(currentTotalNetSalary)}</strong>

            <small>Same calculation as Total Net Salary</small>
          </div>
        </button>
      </div>


      <div className="dashboard-grid two">
        {/* NET SALARY CHART */}

        <section className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Net salary — last 6 months</h2>

              <p className="dashboard-panel-subtitle">
                Total calculated net salary for each month
              </p>
            </div>

            <button type="button" onClick={() => navigate("/payroll")}>
              View payroll
            </button>
          </div>

          <div className="dashboard-six-month-chart">
            {sixMonthNetPay.map((item) => (
              <div className="dashboard-month-column" key={item.key}>
                <span className="dashboard-month-value">
                  {formatCurrency(item.net)}
                </span>

                <div className="dashboard-month-track">
                  <div
                    className="dashboard-month-fill net-salary"
                    style={{
                      height: `${
                        item.net > 0
                          ? Math.max((item.net / maxSixMonthNet) * 100, 4)
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <strong>{item.shortLabel}</strong>

                <small>{item.year}</small>
              </div>
            ))}
          </div>
        </section>

        {/* ATTENDANCE CHART */}

        <section className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Attendance rate — last 6 months</h2>

              <p className="dashboard-panel-subtitle">
                Present and Late records compared with expected working days
              </p>
            </div>

            <button type="button" onClick={() => navigate("/attendance")}>
              View attendance
            </button>
          </div>

          <div className="dashboard-six-month-chart attendance-chart">
            {sixMonthAttendance.map((item) => (
              <div className="dashboard-month-column" key={item.key}>
                <span className="dashboard-month-value">
                  {item.hasRecords ? `${item.rate}%` : "—"}
                </span>

                <div className="dashboard-month-track">
                  <div
                    className="dashboard-month-fill attendance-rate"
                    style={{
                      height: `${
                        item.hasRecords ? Math.max(item.rate, 4) : 0
                      }%`,
                    }}
                  />
                </div>

                <strong>{item.shortLabel}</strong>

                <small>{item.year}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* =================================================
          TODAY + WEEK
      ================================================= */}

      <div className="dashboard-grid two">
        {/* TODAY */}

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2>Today's attendance</h2>

            <button type="button" onClick={() => navigate("/attendance")}>
              View all
            </button>
          </div>

          {employees.length === 0 ? (
            <p className="dashboard-empty">No employees added yet.</p>
          ) : (
            <>
              <div
                className="dashboard-segments"
                role="img"
                aria-label={`${todayStats.present} present, ${todayStats.late} late, ${todayStats.leave} on leave, ${todayStats.absent} absent`}
              >
                {[
                  ["present", todayStats.present],
                  ["late", todayStats.late],
                  ["leave", todayStats.leave],
                  ["absent", todayStats.absent],
                ].map(([status, count]) =>
                  count > 0 ? (
                    <div
                      key={status}
                      className={`dashboard-segment ${status}`}
                      style={{
                        flexGrow: count,
                      }}
                    />
                  ) : null,
                )}
              </div>

              <ul className="dashboard-legend">
                <li>
                  <span className="dot present"></span>
                  Present
                  <strong>{todayStats.present}</strong>
                </li>

                <li>
                  <span className="dot late"></span>
                  Late
                  <strong>{todayStats.late}</strong>
                </li>

                <li>
                  <span className="dot leave"></span>
                  Leave
                  <strong>{todayStats.leave}</strong>
                </li>

                <li>
                  <span className="dot absent"></span>
                  Absent
                  <strong>{todayStats.absent}</strong>
                </li>
              </ul>

              {todayStats.unmarked > 0 && (
                <div className="dashboard-notice">
                  <span>
                    {todayStats.unmarked}{" "}
                    {todayStats.unmarked === 1
                      ? "employee has"
                      : "employees have"}{" "}
                    no record for today.
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/marking", {
                        state: {
                          date: today,
                        },
                      })
                    }
                  >
                    Mark now
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* LAST 7 DAYS */}

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2>Attendance, last 7 days</h2>
          </div>

          <div className="dashboard-bars">
            {weeklyTrend.map((day) => (
              <div
                key={day.key}
                className={`dashboard-bar-col ${
                  day.isWeekend ? "weekend" : ""
                }`}
              >
                <span className="dashboard-bar-value">
                  {day.hasRecords ? `${day.rate}%` : "–"}
                </span>

                <div className="dashboard-bar-track">
                  <div
                    className="dashboard-bar-fill"
                    style={{
                      height: `${day.rate}%`,
                    }}
                  />
                </div>

                <span className="dashboard-bar-label">{day.label}</span>
              </div>
            ))}
          </div>

          <p className="dashboard-note">
            Share of employees marked Present or Late each day.
          </p>
        </section>
      </div>

      {/* =================================================
          DEPARTMENTS + PAYROLL
      ================================================= */}

      <div className="dashboard-grid two">
        {/* DEPARTMENTS */}

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2>Headcount by department</h2>
          </div>

          {departments.length === 0 ? (
            <p className="dashboard-empty">No departments to show.</p>
          ) : (
            <ul className="dashboard-departments">
              {departments.map((department) => (
                <li key={department.name}>
                  <div className="dashboard-department-row">
                    <span>{department.name}</span>

                    <strong>{department.count}</strong>
                  </div>

                  <div className="dashboard-department-track">
                    <div
                      className="dashboard-department-fill"
                      style={{
                        width: `${
                          (department.count / largestDepartment) * 100
                        }%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="dashboard-note">
            Combined monthly basic salary: {formatCurrency(totalBasicSalary)}
          </p>
        </section>

        {/* PAYROLL */}

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2>
              Payroll, {currentMonth} {currentYear}
            </h2>

            <button type="button" onClick={() => navigate("/payroll")}>
              Open payroll
            </button>
          </div>

          <div className="dashboard-payroll">
            <div>
              <span>Gross salary</span>

              <strong>
                {formatCurrency(
                  currentMonthPayroll.reduce(
                    (total, employee) =>
                      total + parseMoney(employee.grossSalary),
                    0,
                  ),
                )}
              </strong>
            </div>

            <div>
              <span>Total deductions</span>

              <strong>
                {formatCurrency(
                  currentMonthPayroll.reduce(
                    (total, employee) =>
                      total + parseMoney(employee.totalDeductions),
                    0,
                  ),
                )}
              </strong>
            </div>

            <div className="net">
              <span>Net salary</span>

              <strong>{formatCurrency(currentTotalNetSalary)}</strong>
            </div>
          </div>
        </section>
      </div>

      {/* =================================================
          RECENT PAYSLIPS
      ================================================= */}

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <h2>Recent payslips</h2>
        </div>

        {recentPayslips.length === 0 ? (
          <p className="dashboard-empty">No saved payslips generated yet.</p>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Employee</th>

                  <th>Period</th>

                  <th>Gross salary</th>

                  <th>Deductions</th>

                  <th>Net salary</th>
                </tr>
              </thead>

              <tbody>
                {recentPayslips.map((payroll) => {
                  const employee = getEmployeeForPayroll(payroll);

                  const name = employee
                    ? getEmployeeName(employee)
                    : payroll.employeeName || "Employee";

                  const employeeCode =
                    employee?.employeesId ??
                    payroll.employeesId ??
                    payroll.employeeId;

                  return (
                    <tr
                      key={
                        payroll.id ??
                        `${employeeCode}-${payroll.month}-${payroll.year}`
                      }
                    >
                      <td>
                        <div className="dashboard-employee">
                          <div className="dashboard-avatar">
                            {name.charAt(0).toUpperCase()}
                          </div>

                          {employeeCode ? (
                            <button
                              type="button"
                              className="dashboard-link"
                              onClick={() =>
                                navigate(`/employees/${employeeCode}`)
                              }
                            >
                              {name}
                            </button>
                          ) : (
                            <span>{name}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        {payroll.month} {payroll.year}
                      </td>

                      <td>
                        {formatCurrency(payroll.grossSalary ?? payroll.gross)}
                      </td>

                      <td>
                        {formatCurrency(
                          payroll.totalDeductions ?? payroll.deductions,
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(payroll.netSalary ?? payroll.net)}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
