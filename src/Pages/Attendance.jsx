import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Attendance.css";

const EMPLOYEES_API_URL = "http://localhost:3001/employees";
const ATTENDANCE_API_URL = "http://localhost:3001/attendance";
const PAYROLL_API_URL = "http://localhost:3001/payrolls";

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCurrentMonth = () => {
  return getToday().slice(0, 7);
};

const getEmployeeName = (employee) => {
  return `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();
};

const getMonthName = (month) => {
  if (!month) return "";

  const [year, monthNumber] = month.split("-");

  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString(
    "en-GH",
    {
      month: "long",
      year: "numeric",
    },
  );
};

const getWorkingDaysInMonth = (month) => {
  if (!month) return 0;

  const [year, monthNumber] = month.split("-").map(Number);

  const date = new Date(year, monthNumber - 1, 1);
  let workingDays = 0;

  while (date.getMonth() === monthNumber - 1) {
    const day = date.getDay();

    // Sunday = 0, Saturday = 6
    if (day !== 0 && day !== 6) {
      workingDays += 1;
    }

    date.setDate(date.getDate() + 1);
  }

  return workingDays;
};

const getPayrollMonthKey = (payroll) => {
  if (!payroll?.month || !payroll?.year) {
    return "";
  }

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  let monthNumber;

  if (typeof payroll.month === "number") {
    monthNumber = payroll.month;
  } else {
    const monthText = String(payroll.month).toLowerCase().trim();

    if (/^\d+$/.test(monthText)) {
      monthNumber = Number(monthText);
    } else {
      monthNumber = monthNames.indexOf(monthText) + 1;
    }
  }

  if (!monthNumber || monthNumber < 1 || monthNumber > 12) {
    return "";
  }

  return `${payroll.year}-${String(monthNumber).padStart(2, "0")}`;
};

const getLatestPayroll = (payrolls, employee, selectedMonth) => {
  const employeeId = String(employee.employeesId);

  const matchingPayrolls = payrolls.filter((payroll) => {
    const payrollEmployeeId = String(
      payroll.employeesId || payroll.employeeId || "",
    );

    const payrollMonth = getPayrollMonthKey(payroll);

    return payrollEmployeeId === employeeId && payrollMonth === selectedMonth;
  });

  if (matchingPayrolls.length === 0) {
    return null;
  }

  return [...matchingPayrolls].sort((first, second) => {
    const firstDate = new Date(first.generatedAt || 0).getTime();
    const secondDate = new Date(second.generatedAt || 0).getTime();

    return secondDate - firstDate;
  })[0];
};

const getNumericSalary = (payroll) => {
  if (!payroll) return 0;

  const salary = Number(payroll.monthlySalary);

  return Number.isFinite(salary) && salary >= 0 ? salary : 0;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const Attendance = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payrolls, setPayrolls] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const employeesPerPage = 10;

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const [loading, setLoading] = useState(true);
  const [payrollLoading, setPayrollLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // FETCH EMPLOYEES
  // =====================================================

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(EMPLOYEES_API_URL);

        if (!response.ok) {
          throw new Error("Failed to fetch employees.");
        }

        const data = await response.json();

        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching employees:", err);
        setError(err.message);
      }
    };

    fetchEmployees();
  }, []);

  // =====================================================
  // FETCH ATTENDANCE
  // =====================================================

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(ATTENDANCE_API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch attendance.");
      }

      const data = await response.json();

      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError(err.message);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // =====================================================
  // FETCH PAYROLLS
  // =====================================================

  const fetchPayrolls = async () => {
    try {
      setPayrollLoading(true);

      const response = await fetch(PAYROLL_API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch payroll records.");
      }

      const data = await response.json();

      setPayrolls(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching payrolls:", err);
      setPayrolls([]);
      setError(err.message);
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  // =====================================================
  // DATE CHANGE
  // =====================================================

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
    setCurrentPage(1);
    setMessage("");
  };

  // =====================================================
  // MONTH CHANGE
  // =====================================================

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
    setMessage("");
  };

  // =====================================================
  // FIND EMPLOYEE
  // =====================================================

  const getEmployee = (employeeId) => {
    return employees.find(
      (employee) => String(employee.employeesId) === String(employeeId),
    );
  };

  // =====================================================
  // GET ATTENDANCE RECORD
  // =====================================================

  const getAttendanceRecord = (employeeId, date = selectedDate) => {
    return attendance.find(
      (record) =>
        String(record.employeeId) === String(employeeId) &&
        record.date === date,
    );
  };

  // =====================================================
  // RECORD ATTENDANCE
  // =====================================================

  const handleRecordAttendance = () => {
    navigate("/marking", {
      state: {
        date: selectedDate,
      },
    });
  };

  // =====================================================
  // MARK INDIVIDUAL EMPLOYEE
  // =====================================================

  const handleMarkEmployee = (employee) => {
    navigate("/marking", {
      state: {
        date: selectedDate,
        employeeId: employee.employeesId,
      },
    });
  };

  // =====================================================
  // EDIT ATTENDANCE
  // =====================================================

  const handleEdit = (record) => {
    navigate("/marking", {
      state: {
        date: record.date,
        employeeId: record.employeeId,
        editRecord: record,
      },
    });
  };

  // =====================================================
  // DELETE ATTENDANCE
  // =====================================================

  const handleDelete = async (recordId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this attendance record?",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${ATTENDANCE_API_URL}/${recordId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      setAttendance((previous) =>
        previous.filter((record) => record.id !== recordId),
      );

      setMessage("Attendance record deleted successfully.");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error("Error deleting attendance:", err);
      setError(err.message);
    }
  };

  // =====================================================
  // SEARCH EMPLOYEES
  // =====================================================

  const filteredEmployees = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return employees.filter((employee) => {
      const firstName = employee.firstName?.toLowerCase() || "";
      const lastName = employee.lastName?.toLowerCase() || "";
      const employeeId = String(employee.employeesId || "").toLowerCase();
      const email = employee.email?.toLowerCase() || "";

      return (
        firstName.includes(search) ||
        lastName.includes(search) ||
        employeeId.includes(search) ||
        email.includes(search)
      );
    });
  }, [employees, searchTerm]);

  // =====================================================
  // PAGINATION
  // =====================================================

  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  const startIndex = (currentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;

  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(filteredEmployees.length / employeesPerPage),
    );

    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredEmployees.length, currentPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // =====================================================
  // DAILY ATTENDANCE
  // =====================================================

  const selectedDateAttendance = attendance.filter(
    (record) => record.date === selectedDate,
  );

  // =====================================================
  // DAILY STATISTICS
  // =====================================================

  const presentCount = selectedDateAttendance.filter(
    (record) => record.status === "Present",
  ).length;

  const lateCount = selectedDateAttendance.filter(
    (record) => record.status === "Late",
  ).length;

  const leaveCount = selectedDateAttendance.filter(
    (record) => record.status === "Leave",
  ).length;

  const absentCount = employees.filter((employee) => {
    const record = getAttendanceRecord(employee.employeesId, selectedDate);

    return !record || record.status === "Absent";
  }).length;

  const attendancePercentage =
    employees.length > 0
      ? Math.round(((presentCount + lateCount) / employees.length) * 100)
      : 0;

  // =====================================================
  // MONTHLY WORKING DAYS
  // =====================================================

  const monthlyWorkingDays = useMemo(() => {
    return getWorkingDaysInMonth(selectedMonth);
  }, [selectedMonth]);

  // =====================================================
  // MONTHLY PAYMENT CALCULATION
  // =====================================================

  const monthlyPaymentData = useMemo(() => {
    return employees.map((employee) => {
      const employeeId = String(employee.employeesId);

      const employeeMonthlyAttendance = attendance.filter((record) => {
        return (
          String(record.employeeId) === employeeId &&
          typeof record.date === "string" &&
          record.date.startsWith(selectedMonth)
        );
      });

      const presentDays = employeeMonthlyAttendance.filter(
        (record) => record.status === "Present",
      ).length;

      const lateDays = employeeMonthlyAttendance.filter(
        (record) => record.status === "Late",
      ).length;

      const leaveDays = employeeMonthlyAttendance.filter(
        (record) => record.status === "Leave",
      ).length;

      const absentDays = employeeMonthlyAttendance.filter(
        (record) => record.status === "Absent",
      ).length;

      const daysWorked = presentDays + lateDays;

      const payroll = getLatestPayroll(payrolls, employee, selectedMonth);

      const monthlySalary = getNumericSalary(payroll);

      const dailySalary =
        monthlyWorkingDays > 0 ? monthlySalary / monthlyWorkingDays : 0;

      const earnedSalary = dailySalary * daysWorked;

      return {
        employee,
        employeeId,
        employeeName: getEmployeeName(employee),
        presentDays,
        lateDays,
        leaveDays,
        absentDays,
        daysWorked,
        monthlyWorkingDays,
        monthlySalary,
        dailySalary,
        earnedSalary,
        payroll,
      };
    });
  }, [employees, attendance, payrolls, selectedMonth, monthlyWorkingDays]);

  const totalMonthlyPayment = useMemo(() => {
    return monthlyPaymentData.reduce(
      (total, employee) => total + employee.earnedSalary,
      0,
    );
  }, [monthlyPaymentData]);

  const totalDaysWorked = useMemo(() => {
    return monthlyPaymentData.reduce(
      (total, employee) => total + employee.daysWorked,
      0,
    );
  }, [monthlyPaymentData]);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <div>
          <h1>Attendance</h1>
          <p>Track attendance and calculate monthly employee payments.</p>
        </div>

        <button
          type="button"
          className="add-attendance-btn"
          onClick={handleRecordAttendance}
        >
          <i className="fa-solid fa-plus"></i>
          Record Attendance
        </button>
      </div>

      {message && (
        <div className="attendance-message">
          <i className="fa-solid fa-circle-check"></i>
          {message}
        </div>
      )}

      {error && (
        <div className="attendance-message error">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </div>
      )}

      <div className="attendance-stats">
        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <i className="fa-solid fa-users"></i>
          </div>

          <div>
            <span>Total Employees</span>
            <strong>{employees.length}</strong>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon present-icon">
            <i className="fa-solid fa-user-check"></i>
          </div>

          <div>
            <span>Present</span>
            <strong>{presentCount}</strong>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon absent-icon">
            <i className="fa-solid fa-user-xmark"></i>
          </div>

          <div>
            <span>Absent</span>
            <strong>{absentCount}</strong>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon late-icon">
            <i className="fa-solid fa-clock"></i>
          </div>

          <div>
            <span>Late</span>
            <strong>{lateCount}</strong>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon leave-icon">
            <i className="fa-solid fa-calendar-xmark"></i>
          </div>

          <div>
            <span>Leave</span>
            <strong>{leaveCount}</strong>
          </div>
        </div>
      </div>

      <div className="attendance-progress-card">
        <div className="attendance-progress-header">
          <div>
            <span>Attendance Rate</span>
            <strong>{attendancePercentage}%</strong>
          </div>

          <small>{formatDate(selectedDate)}</small>
        </div>

        <div className="attendance-progress">
          <div
            className="attendance-progress-bar"
            style={{
              width: `${attendancePercentage}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="attendance-panel">
        <div className="attendance-toolbar">
          <div className="attendance-search">
            <i className="fa-solid fa-magnifying-glass"></i>

            <input
              type="text"
              placeholder="Search by name, ID or email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="attendance-date">
            <label>Date</label>

            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>
        </div>

        <div className="attendance-table-container">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="attendance-empty">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Loading attendance...</span>
                  </td>
                </tr>
              ) : currentEmployees.length > 0 ? (
                currentEmployees.map((employee) => {
                  const record = getAttendanceRecord(
                    employee.employeesId,
                    selectedDate,
                  );

                  const status = record?.status || "Absent";

                  return (
                    <tr key={employee.employeesId}>
                      <td>
                        <div className="attendance-employee">
                          <div className="attendance-avatar">
                            {employee.firstName?.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {employee.firstName} {employee.lastName}
                            </strong>

                            <small>{employee.email}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="attendance-employee-id">
                          {employee.employeesId}
                        </span>
                      </td>

                      <td>{formatDate(selectedDate)}</td>

                      <td>
                        <span
                          className={`attendance-status ${status.toLowerCase()}`}
                        >
                          <span className="status-dot"></span>
                          {status}
                        </span>
                      </td>

                      <td>{record?.checkIn || "--"}</td>

                      <td>{record?.checkOut || "--"}</td>

                      <td>
                        <div className="attendance-actions">
                          {record ? (
                            <>
                              <button
                                type="button"
                                className="attendance-view-btn"
                                title="Edit attendance"
                                onClick={() => handleEdit(record)}
                              >
                                <i className="fa-solid fa-pen"></i>
                              </button>

                              <button
                                type="button"
                                className="attendance-delete-btn"
                                title="Delete attendance"
                                onClick={() => handleDelete(record.id)}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="mark-attendance-btn"
                              onClick={() => handleMarkEmployee(employee)}
                            >
                              <i className="fa-solid fa-check"></i>
                              Mark
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="attendance-empty">
                    <div>
                      <i className="fa-solid fa-users-slash"></i>
                      <h3>No Employees Found</h3>
                      <p>Try changing your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length > 0 && totalPages > 1 && (
          <div className="attendance-pagination">
            <div className="pagination-info">
              Showing {startIndex + 1}-
              {Math.min(endIndex, filteredEmployees.length)} of{" "}
              {filteredEmployees.length} employees
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    type="button"
                    key={page}
                    className={`pagination-btn ${
                      currentPage === page ? "active" : ""
                    }`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          MONTHLY PAYMENT SECTION
      ===================================================== */}

      <div className="attendance-panel monthly-payment-panel">
        <div className="monthly-payment-header">
          <div>
            <h2>Monthly Attendance Payment</h2>
            <p>Payment is calculated using Present and Late attendance only.</p>
          </div>

          <div className="monthly-payment-filter">
            <label htmlFor="payment-month">Select Payroll Month</label>

            <input
              id="payment-month"
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
            />
          </div>
        </div>

        <div className="monthly-payment-summary">
          <div className="monthly-summary-card">
            <span>Selected Month</span>
            <strong>{getMonthName(selectedMonth)}</strong>
          </div>

          <div className="monthly-summary-card">
            <span>Weekdays</span>
            <strong>{monthlyWorkingDays}</strong>
          </div>

          <div className="monthly-summary-card">
            <span>Total Days Worked</span>
            <strong>{totalDaysWorked}</strong>
          </div>

          <div className="monthly-summary-card">
            <span>Total Payment</span>
            <strong>{formatCurrency(totalMonthlyPayment)}</strong>
          </div>
        </div>

        {payrollLoading ? (
          <div className="attendance-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Loading payroll records...</span>
          </div>
        ) : (
          <div className="attendance-table-container">
            <table className="attendance-table monthly-payment-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Working Days</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Days Worked</th>
                  <th>Monthly Salary</th>
                  <th>Daily Salary</th>
                  <th>Payment</th>
                </tr>
              </thead>

              <tbody>
                {monthlyPaymentData.length > 0 ? (
                  monthlyPaymentData.map((item) => (
                    <tr key={item.employeeId}>
                      <td>
                        <div className="attendance-employee">
                          <div className="attendance-avatar">
                            {item.employee.firstName?.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <strong>{item.employeeName}</strong>
                            <small>
                              {item.employee.department || "No department"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="attendance-employee-id">
                          {item.employeeId}
                        </span>
                      </td>

                      <td>{item.monthlyWorkingDays}</td>

                      <td>{item.presentDays}</td>

                      <td>{item.lateDays}</td>

                      <td>
                        <strong>{item.daysWorked}</strong>
                      </td>

                      <td>
                        {item.payroll ? (
                          formatCurrency(item.monthlySalary)
                        ) : (
                          <span className="no-payroll">No payroll</span>
                        )}
                      </td>

                      <td>{formatCurrency(item.dailySalary)}</td>

                      <td>
                        <strong className="payment-amount">
                          {formatCurrency(item.earnedSalary)}
                        </strong>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="attendance-empty">
                      No employee payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="monthly-payment-footer">
          <div>
            <strong>Payment Calculation:</strong>
            <span>Monthly Salary ÷ Weekdays × (Present + Late)</span>
          </div>

          <div>
            <strong>Total Payment:</strong>
            <span className="payment-amount">
              {formatCurrency(totalMonthlyPayment)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
