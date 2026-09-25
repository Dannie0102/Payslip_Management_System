import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Payslip.css";

// =====================================================
// API
// =====================================================

const API_URL = "http://localhost:3001/employees";
const PAYROLL_API_URL = "http://localhost:3001/payrolls";
const ATTENDANCE_API_URL = "http://localhost:3001/attendance";

// =====================================================
// LOCAL STORAGE
// =====================================================

const PAYROLL_STORAGE_KEY = "employee_payrolls";
const PAYROLL_INPUT_STORAGE_KEY = "employee_payroll_inputs";

const HISTORY_STORAGE_KEY = "payslip_history";
const GENERATED_PAYROLL_KEY = "generated_payroll";

// =====================================================
// TAX
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
// PREVIOUS MONTH
// =====================================================

const getPreviousMonthAndYear = () => {
  const now = new Date();

  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    month: MONTHS[previousMonthDate.getMonth()],

    year: previousMonthDate.getFullYear(),
  };
};

// =====================================================
// MONEY
// =====================================================

const parseMoney = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value).replace(/[^0-9.-]+/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
};

const formatCurrency = (value) => {
  return `GHS ${parseMoney(value).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// =====================================================
// STORAGE
// =====================================================

const getStorageData = (key, fallback = {}) => {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    const parsed = JSON.parse(saved);

    return parsed ?? fallback;
  } catch (error) {
    console.error(`Unable to read ${key}:`, error);

    return fallback;
  }
};

// =====================================================
// ATTENDANCE MONTH
// =====================================================

const getAttendanceMonthKey = (month, year) => {
  const monthIndex = MONTHS.findIndex(
    (item) => item.toLowerCase() === String(month).toLowerCase(),
  );

  if (monthIndex < 0) {
    return "";
  }

  return `${Number(year)}-${String(monthIndex + 1).padStart(2, "0")}`;
};

// =====================================================
// WORKING DAYS
// =====================================================

const getWorkingDaysInMonth = (month, year) => {
  const monthIndex = MONTHS.findIndex(
    (item) => item.toLowerCase() === String(month).toLowerCase(),
  );

  if (monthIndex < 0) {
    return 0;
  }

  const date = new Date(Number(year), monthIndex, 1);

  let count = 0;

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
// EMPLOYEE IDS
// =====================================================

const getEmployeeIds = (employee) => {
  return [employee?.employeesId, employee?.employeeId, employee?.id]
    .filter((id) => id !== undefined && id !== null)
    .map(String);
};

// =====================================================
// COMPONENT
// =====================================================

const Payslip = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const previousMonthData = getPreviousMonthAndYear();

  const currentYear = new Date().getFullYear();

  const YEAR_OPTIONS = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  // ===================================================
  // STATES
  // ===================================================

  const [employees, setEmployees] = useState([]);

  const [payrolls, setPayrolls] = useState([]);

  const [attendance, setAttendance] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    location.state?.selectedMonth ??
      location.state?.month ??
      previousMonthData.month,
  );

  const [selectedYear, setSelectedYear] = useState(
    Number(
      location.state?.selectedYear ??
        location.state?.year ??
        previousMonthData.year,
    ),
  );

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [payrollInputs, setPayrollInputs] = useState({});

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [generateInputs, setGenerateInputs] = useState({});

  // ===================================================
  // PAYROLL INPUT KEY
  // ===================================================

  const getPayrollInputKey = (
    employeeId,
    month = selectedMonth,
    year = selectedYear,
  ) => {
    return `${String(employeeId)}-${month}-${Number(year)}`;
  };

  // ===================================================
  // LOAD PAYROLL INPUTS
  // ===================================================

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PAYROLL_INPUT_STORAGE_KEY);

      if (!stored) {
        setPayrollInputs({});
        return;
      }

      const parsed = JSON.parse(stored);

      setPayrollInputs(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setPayrollInputs({});
    }
  }, []);

  // ===================================================
  // SAVE PAYROLL INPUTS
  // ===================================================

  useEffect(() => {
    try {
      localStorage.setItem(
        PAYROLL_INPUT_STORAGE_KEY,
        JSON.stringify(payrollInputs),
      );
    } catch {
      // Ignore
    }
  }, [payrollInputs]);

  // ===================================================
  // FETCH EMPLOYEES
  // ===================================================

  const fetchEmployees = async () => {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch employees.");
      }

      const data = await response.json();

      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Employee fetch error:", err);

      setError(
        "Unable to load employees. Please make sure JSON Server is running.",
      );

      try {
        const stored = localStorage.getItem("employees");

        if (stored) {
          const parsed = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            setEmployees(parsed);
          }
        }
      } catch {
        // Ignore
      }
    }
  };

  // ===================================================
  // FETCH PAYROLL
  // ===================================================

  const fetchPayrolls = async () => {
    try {
      const response = await fetch(PAYROLL_API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch payrolls.");
      }

      const data = await response.json();

      const payrollData = Array.isArray(data) ? data : [];

      setPayrolls(payrollData);

      localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(payrollData));

      return payrollData;
    } catch (err) {
      console.error("Payroll fetch error:", err);

      const saved = getStorageData(PAYROLL_STORAGE_KEY, []);

      const payrollData = Array.isArray(saved)
        ? saved
        : Object.values(saved || {});

      setPayrolls(payrollData);

      return payrollData;
    }
  };

  // ===================================================
  // FETCH ATTENDANCE
  // ===================================================

  const fetchAttendance = async () => {
    try {
      setAttendanceLoading(true);

      const response = await fetch(ATTENDANCE_API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch attendance.");
      }

      const data = await response.json();

      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Attendance fetch error:", err);

      setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      await Promise.all([fetchEmployees(), fetchPayrolls(), fetchAttendance()]);

      setLoading(false);
    };

    loadData();
  }, []);

  // ===================================================
  // AUTOMATICALLY SELECT ALL EMPLOYEES
  // ===================================================

  useEffect(() => {
    if (employees.length > 0) {
      setSelectedEmployeeIds(
        employees.map((employee) =>
          String(employee.employeesId ?? employee.employeeId ?? employee.id),
        ),
      );
    }
  }, [employees]);

  // ===================================================
  // RELOAD ATTENDANCE WHEN PERIOD CHANGES
  // ===================================================

  useEffect(() => {
    if (!loading) {
      fetchAttendance();
    }
  }, [selectedMonth, selectedYear]);

  // ===================================================
  // GET SAVED PAYROLL
  // ===================================================

  const getSavedPayroll = (
    employee,
    month = selectedMonth,
    year = selectedYear,
  ) => {
    const employeeIds = getEmployeeIds(employee);

    return payrolls.find((payroll) => {
      const payrollIds = [
        payroll.employeesId,
        payroll.employeeId,
        payroll.employeeID,
      ]
        .filter((id) => id !== undefined && id !== null)
        .map(String);

      return (
        employeeIds.some((id) => payrollIds.includes(id)) &&
        String(payroll.month) === String(month) &&
        Number(payroll.year) === Number(year)
      );
    });
  };

  // ===================================================
  // GET PAYROLL INPUT
  // ===================================================

  const getPayrollInput = (
    employee,
    month = selectedMonth,
    year = selectedYear,
  ) => {
    const employeeId =
      employee?.employeesId ?? employee?.employeeId ?? employee?.id;

    const key = getPayrollInputKey(employeeId, month, year);

    if (payrollInputs[key] && typeof payrollInputs[key] === "object") {
      return {
        allowance: parseMoney(payrollInputs[key].allowance),

        otherDeduction: parseMoney(payrollInputs[key].otherDeduction),
      };
    }

    const savedPayroll = getSavedPayroll(employee, month, year);

    if (savedPayroll) {
      return {
        allowance: parseMoney(
          savedPayroll.allowances ?? savedPayroll.allowance,
        ),

        otherDeduction: parseMoney(
          savedPayroll.otherDeductions ?? savedPayroll.otherDeduction,
        ),
      };
    }

    return {
      allowance: 0,
      otherDeduction: 0,
    };
  };

  // ===================================================
  // UPDATE PAYROLL INPUT
  // ===================================================

  const updatePayrollInput = (employeeId, field, value) => {
    const key = getPayrollInputKey(employeeId, selectedMonth, selectedYear);

    setPayrollInputs((previous) => ({
      ...previous,

      [key]: {
        ...(previous[key] || {
          allowance: 0,
          otherDeduction: 0,
        }),

        [field]: value,
      },
    }));
  };

  // ===================================================
  // ATTENDANCE PAYMENT
  //
  // IMPORTANT:
  // THIS FUNCTION IS IDENTICAL IN LOGIC TO
  // Payroll.jsx.
  // ===================================================

  const calculateAttendancePayment = (employee) => {
    const attendanceMonth = getAttendanceMonthKey(selectedMonth, selectedYear);

    const originalMonthlySalary = parseMoney(
      employee.basicSalary ?? employee.monthlySalary ?? employee.salary ?? 0,
    );

    if (!attendanceMonth) {
      return {
        originalMonthlySalary,
        workingDays: 0,
        presentDays: 0,
        lateDays: 0,
        leaveDays: 0,
        absentDays: 0,
        daysWorked: 0,
        dailySalary: 0,
        earnedSalary: 0,
      };
    }

    const employeeIds = getEmployeeIds(employee);

    const monthlyAttendance = attendance.filter(
      (record) =>
        employeeIds.includes(String(record.employeeId)) &&
        typeof record.date === "string" &&
        record.date.startsWith(attendanceMonth),
    );

    const presentDays = monthlyAttendance.filter(
      (record) => String(record.status).toLowerCase() === "present",
    ).length;

    const lateDays = monthlyAttendance.filter(
      (record) => String(record.status).toLowerCase() === "late",
    ).length;

    const leaveDays = monthlyAttendance.filter(
      (record) => String(record.status).toLowerCase() === "leave",
    ).length;

    const absentDays = monthlyAttendance.filter(
      (record) => String(record.status).toLowerCase() === "absent",
    ).length;

    const daysWorked = presentDays + lateDays;

    const workingDays = getWorkingDaysInMonth(selectedMonth, selectedYear);

    const dailySalary =
      workingDays > 0 ? originalMonthlySalary / workingDays : 0;

    // =================================================
    // SAME MONTH SALARY USED BY PAYROLL
    // =================================================

    const earnedSalary = dailySalary * daysWorked;

    return {
      originalMonthlySalary,
      workingDays,
      presentDays,
      lateDays,
      leaveDays,
      absentDays,
      daysWorked,
      dailySalary,
      earnedSalary,
    };
  };

  // ===================================================
  // COMPLETE PAYROLL CALCULATION
  // ===================================================

  const calculatePayroll = (employee) => {
    const savedPayroll = getSavedPayroll(employee, selectedMonth, selectedYear);

    const input = getPayrollInput(employee, selectedMonth, selectedYear);

    const attendancePayment = calculateAttendancePayment(employee);

    // =================================================
    // MONTH SALARY
    //
    // THIS MUST MATCH PAYROLL.JSX
    // =================================================

    const monthSalary = attendancePayment.earnedSalary;

    const allowance = parseMoney(input.allowance);

    const otherDeduction = parseMoney(input.otherDeduction);

    const grossSalary = monthSalary + allowance;

    const ssnit = monthSalary * SSNIT_RATE;

    const payeTax = monthSalary * TAX_RATE;

    const totalDeductions = payeTax + otherDeduction;

    const netSalary = grossSalary - totalDeductions;

    const firstName = employee.firstName ?? "";

    const lastName = employee.lastName ?? "";

    const employeeName =
      `${firstName} ${lastName}`.trim() ||
      employee.name ||
      employee.fullName ||
      "Employee";

    const employeeId =
      employee.employeesId ?? employee.employeeId ?? employee.id;

    return {
      ...employee,

      id: employee.id,

      employeeId,

      employeesId: employee.employeesId ?? employee.employeeId ?? employee.id,

      firstName,

      lastName,

      employeeName,

      email: employee.email ?? "",

      department: employee.department ?? "",

      position: employee.position ?? "",

      month: selectedMonth,

      year: Number(selectedYear),

      // =================================================
      // ORIGINAL SALARY
      // =================================================

      originalMonthlySalary: attendancePayment.originalMonthlySalary,

      // =================================================
      // MONTH SALARY
      // =================================================

      monthSalary,

      // These fields are kept consistent with Month Salary.
      basicSalary: monthSalary,

      monthlySalary: monthSalary,

      // =================================================
      // ALLOWANCE
      // =================================================

      allowance,

      allowances: allowance,

      // =================================================
      // GROSS
      // =================================================

      grossSalary,

      // =================================================
      // SSNIT
      // =================================================

      ssnit,

      ssnitRate: 13,

      // =================================================
      // PAYE
      // =================================================

      payeTax,

      payeRate: 5.5,

      // =================================================
      // OTHER DEDUCTION
      // =================================================

      otherDeduction,

      otherDeductions: otherDeduction,

      // =================================================
      // TOTAL
      // =================================================

      totalDeductions,

      netSalary,

      // =================================================
      // ATTENDANCE
      // =================================================

      workingDays: attendancePayment.workingDays,

      presentDays: attendancePayment.presentDays,

      lateDays: attendancePayment.lateDays,

      leaveDays: attendancePayment.leaveDays,

      absentDays: attendancePayment.absentDays,

      daysWorked: attendancePayment.daysWorked,

      dailySalary: attendancePayment.dailySalary,

      attendanceEarnedSalary: attendancePayment.earnedSalary,

      payrollRecordId: savedPayroll?.id ?? null,
    };
  };

  // ===================================================
  // PAYROLL LIST
  // ===================================================

  const payrollList = useMemo(() => {
    return employees.map(calculatePayroll);
  }, [
    employees,
    attendance,
    payrolls,
    payrollInputs,
    selectedMonth,
    selectedYear,
  ]);

  // ===================================================
  // SEARCH
  // ===================================================

  const filteredPayrolls = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return payrollList;
    }

    return payrollList.filter(
      (payroll) =>
        String(payroll.employeeName).toLowerCase().includes(search) ||
        String(payroll.employeesId ?? "")
          .toLowerCase()
          .includes(search) ||
        String(payroll.employeeId ?? "")
          .toLowerCase()
          .includes(search) ||
        String(payroll.email ?? "")
          .toLowerCase()
          .includes(search) ||
        String(payroll.department ?? "")
          .toLowerCase()
          .includes(search) ||
        String(payroll.position ?? "")
          .toLowerCase()
          .includes(search),
    );
  }, [payrollList, searchTerm]);

  // ===================================================
  // TOTALS
  // ===================================================

  const totals = useMemo(() => {
    return filteredPayrolls.reduce(
      (result, payroll) => {
        result.basicSalary += parseMoney(payroll.basicSalary);

        result.monthSalary += parseMoney(payroll.monthSalary);

        result.allowances += parseMoney(payroll.allowances);

        result.grossSalary += parseMoney(payroll.grossSalary);

        result.ssnit += parseMoney(payroll.ssnit);

        result.payeTax += parseMoney(payroll.payeTax);

        result.otherDeductions += parseMoney(payroll.otherDeductions);

        result.totalDeductions += parseMoney(payroll.totalDeductions);

        result.netSalary += parseMoney(payroll.netSalary);

        return result;
      },
      {
        basicSalary: 0,
        monthSalary: 0,
        allowances: 0,
        grossSalary: 0,
        ssnit: 0,
        payeTax: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        netSalary: 0,
      },
    );
  }, [filteredPayrolls]);

  // ===================================================
  // SELECT EMPLOYEE
  // ===================================================

  const toggleEmployeeSelection = (employeeId) => {
    const id = String(employeeId);

    setSelectedEmployeeIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id);
      }

      return [...previous, id];
    });
  };

  // ===================================================
  // SELECT ALL
  // ===================================================

  const toggleSelectAll = () => {
    const ids = filteredPayrolls.map((employee) => String(employee.employeeId));

    const allSelected =
      ids.length > 0 && ids.every((id) => selectedEmployeeIds.includes(id));

    if (allSelected) {
      setSelectedEmployeeIds((previous) =>
        previous.filter((id) => !ids.includes(id)),
      );
    } else {
      setSelectedEmployeeIds((previous) => [...new Set([...previous, ...ids])]);
    }
  };

  const allEmployeesSelected =
    filteredPayrolls.length > 0 &&
    filteredPayrolls.every((employee) =>
      selectedEmployeeIds.includes(String(employee.employeeId)),
    );

  // ===================================================
  // OPEN GENERATE MODAL
  // ===================================================

  const openGenerateModal = () => {
    if (selectedEmployeeIds.length === 0) {
      setError("Please select at least one employee.");

      return;
    }

    const inputs = {};

    selectedEmployeeIds.forEach((employeeId) => {
      const employee = employees.find(
        (item) =>
          String(item.employeesId ?? item.employeeId ?? item.id) ===
          String(employeeId),
      );

      if (!employee) {
        return;
      }

      const input = getPayrollInput(employee, selectedMonth, selectedYear);

      inputs[employeeId] = {
        allowance: input.allowance,

        otherDeduction: input.otherDeduction,
      };
    });

    setGenerateInputs(inputs);

    setShowGenerateModal(true);

    setError("");
  };

  // ===================================================
  // UPDATE GENERATE INPUT
  // ===================================================

  const updateGenerateInput = (employeeId, field, value) => {
    setGenerateInputs((previous) => ({
      ...previous,

      [employeeId]: {
        ...(previous[employeeId] || {
          allowance: 0,
          otherDeduction: 0,
        }),

        [field]: value,
      },
    }));
  };

  // ===================================================
  // SAVE GENERATE INPUTS
  // ===================================================

  const saveGeneratedInputs = () => {
    let storedInputs = {};

    try {
      const saved = localStorage.getItem(PAYROLL_INPUT_STORAGE_KEY);

      storedInputs = saved ? JSON.parse(saved) : {};
    } catch {
      storedInputs = {};
    }

    selectedEmployeeIds.forEach((employeeId) => {
      const key = getPayrollInputKey(employeeId, selectedMonth, selectedYear);

      storedInputs[key] = {
        allowance: parseMoney(generateInputs[employeeId]?.allowance),

        otherDeduction: parseMoney(generateInputs[employeeId]?.otherDeduction),
      };
    });

    localStorage.setItem(
      PAYROLL_INPUT_STORAGE_KEY,
      JSON.stringify(storedInputs),
    );

    setPayrollInputs(storedInputs);

    setShowGenerateModal(false);

    setMessage(`Payroll inputs updated for ${selectedMonth} ${selectedYear}.`);
  };

  // ===================================================
  // SAVE / UPDATE PAYROLL
  // ===================================================

  const handleSavePayroll = async () => {
    if (employees.length === 0) {
      setError("There are no employees to save.");

      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const savedRecords = [];

      for (const employee of employees) {
        const calculated = calculatePayroll(employee);

        const employeeId =
          employee.employeesId ?? employee.employeeId ?? employee.id;

        const existingPayroll = getSavedPayroll(
          employee,
          selectedMonth,
          selectedYear,
        );

        const payrollRecord = {
          employeeId,

          employeesId:
            employee.employeesId ?? employee.employeeId ?? employee.id,

          firstName: employee.firstName ?? "",

          lastName: employee.lastName ?? "",

          employeeName: calculated.employeeName,

          email: calculated.email,

          department: calculated.department,

          position: calculated.position,

          month: selectedMonth,

          year: Number(selectedYear),

          // =================================================
          // ORIGINAL SALARY
          // =================================================

          originalMonthlySalary: calculated.originalMonthlySalary,

          // =================================================
          // MONTH SALARY
          // SAME VALUE AS PAYROLL.JSX
          // =================================================

          monthSalary: calculated.monthSalary,

          attendanceEarnedSalary: calculated.attendanceEarnedSalary,

          basicSalary: calculated.monthSalary,

          monthlySalary: calculated.monthSalary,

          // =================================================
          // ATTENDANCE
          // =================================================

          workingDays: calculated.workingDays,

          presentDays: calculated.presentDays,

          lateDays: calculated.lateDays,

          leaveDays: calculated.leaveDays,

          absentDays: calculated.absentDays,

          daysWorked: calculated.daysWorked,

          dailySalary: calculated.dailySalary,

          // =================================================
          // PAYROLL
          // =================================================

          allowances: calculated.allowances,

          allowance: calculated.allowance,

          grossSalary: calculated.grossSalary,

          ssnit: calculated.ssnit,

          ssnitRate: 13,

          payeTax: calculated.payeTax,

          payeRate: 5.5,

          otherDeductions: calculated.otherDeductions,

          otherDeduction: calculated.otherDeduction,

          totalDeductions: calculated.totalDeductions,

          netSalary: calculated.netSalary,

          generatedAt: existingPayroll?.generatedAt ?? new Date().toISOString(),

          updatedAt: new Date().toISOString(),
        };

        let savedRecord;

        // =================================================
        // UPDATE
        // =================================================

        if (existingPayroll?.id) {
          const response = await fetch(
            `${PAYROLL_API_URL}/${existingPayroll.id}`,
            {
              method: "PATCH",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify(payrollRecord),
            },
          );

          if (!response.ok) {
            throw new Error(
              `Failed to update payroll for ${calculated.employeeName}.`,
            );
          }

          savedRecord = await response.json();
        }

        // =================================================
        // CREATE
        // =================================================
        else {
          const response = await fetch(PAYROLL_API_URL, {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(payrollRecord),
          });

          if (!response.ok) {
            throw new Error(
              `Failed to save payroll for ${calculated.employeeName}.`,
            );
          }

          savedRecord = await response.json();
        }

        savedRecords.push(savedRecord);
      }

      // =================================================
      // REFRESH PAYROLL
      // =================================================

      const refreshed = await fetchPayrolls();

      localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(refreshed));

      // =================================================
      // GENERATED PAYROLL
      // =================================================

      const generatedAt = new Date().toISOString();

      localStorage.setItem(
        GENERATED_PAYROLL_KEY,
        JSON.stringify({
          month: selectedMonth,

          year: Number(selectedYear),

          generatedAt,

          employeeCount: savedRecords.length,

          totalNet: totals.netSalary,
        }),
      );

      // =================================================
      // HISTORY
      // =================================================

      let history = [];

      try {
        const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);

        history = savedHistory ? JSON.parse(savedHistory) : [];
      } catch {
        history = [];
      }

      if (!Array.isArray(history)) {
        history = [];
      }

      history.unshift({
        id: Date.now().toString(),

        month: selectedMonth,

        year: Number(selectedYear),

        employeeCount: savedRecords.length,

        totalGross: totals.grossSalary,

        totalNet: totals.netSalary,

        generatedAt,

        date: new Intl.DateTimeFormat("en-GH", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date()),
      });

      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));

      setMessage(
        `Payroll for ${selectedMonth} ${selectedYear} saved successfully.`,
      );

      await new Promise((resolve) => setTimeout(resolve, 700));

      navigate("/payroll", {
        state: {
          generated: true,

          message: `Payroll for ${selectedMonth} ${selectedYear} generated successfully.`,

          month: selectedMonth,

          year: Number(selectedYear),
        },
      });
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to save payroll.");
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // BACK TO PAYROLL
  // ===================================================

  const handleBackToPayroll = () => {
    navigate("/payroll", {
      state: {
        month: selectedMonth,

        year: Number(selectedYear),
      },
    });
  };

  // ===================================================
  // PRINT
  // ===================================================

  const handlePrint = () => {
    window.print();
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="payslip-page">
        <div className="payslip-loading">
          <div className="page-loader">
            <i className="fa-solid fa-spinner fa-spin"></i>

            <span>Loading payroll...</span>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="payslip-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="payslip-page-header">
        <div>
          <h1>Generate Payroll</h1>

          <p>Generate employee payroll and payslip records.</p>
        </div>

        <div className="payslip-header-actions">
          <button
            type="button"
            className="back-payroll-btn"
            onClick={handleBackToPayroll}
          >
            <i className="fa-solid fa-arrow-left"></i>
            Back to Payroll
          </button>

          <button
            type="button"
            className="print-payroll-btn"
            onClick={handlePrint}
          >
            <i className="fa-solid fa-print"></i>
            Print
          </button>
        </div>
      </div>

      {/* =================================================
          PERIOD CARD
      ================================================= */}

      <div className="payslip-period-card">
        <div className="payslip-period-item">
          <span>Payroll Month</span>

          <select
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);

              setMessage("");
              setError("");

              setSelectedEmployeeIds(
                employees.map((employee) =>
                  String(
                    employee.employeesId ?? employee.employeeId ?? employee.id,
                  ),
                ),
              );
            }}
          >
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="payslip-period-item">
          <span>Payroll Year</span>

          <select
            value={selectedYear}
            onChange={(event) => {
              setSelectedYear(Number(event.target.value));

              setMessage("");
              setError("");

              setSelectedEmployeeIds(
                employees.map((employee) =>
                  String(
                    employee.employeesId ?? employee.employeeId ?? employee.id,
                  ),
                ),
              );
            }}
          >
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="payslip-rate">
          <span>SSNIT</span>

          <strong>13%</strong>

          <small>Calculated, not deducted</small>
        </div>

        <div className="payslip-rate">
          <span>PAYE</span>

          <strong>5.5%</strong>

          <small>Deducted from salary</small>
        </div>
      </div>

      {/* =================================================
          MESSAGES
      ================================================= */}

      {message && (
        <div className="payslip-success">
          <i className="fa-solid fa-circle-check"></i>

          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="payslip-error">
          <i className="fa-solid fa-circle-exclamation"></i>

          <span>{error}</span>
        </div>
      )}

      {/* =================================================
          TOOLBAR
      ================================================= */}

      <div className="payslip-toolbar">
        <div className="payslip-search">
          <label>Search Employee</label>

          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <div className="payslip-toolbar-actions">
          <button
            type="button"
            className="generate-specific-btn"
            onClick={openGenerateModal}
            disabled={saving}
          >
            <i className="fa-solid fa-user-gear"></i>
            Generate Specific Employee
          </button>

          <button
            type="button"
            className="save-payroll-btn"
            onClick={handleSavePayroll}
            disabled={saving}
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Saving Payroll...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i>
                Save / Update Payroll
              </>
            )}
          </button>
        </div>
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="payslip-summary">
        <div className="summary-card">
          <div className="summary-icon employee-icon">
            <i className="fa-solid fa-users"></i>
          </div>

          <span>Employees</span>

          <strong>{filteredPayrolls.length}</strong>
        </div>

        <div className="summary-card">
          <div className="summary-icon gross-icon">
            <i className="fa-solid fa-money-bill-wave"></i>
          </div>

          <span>Month Salary</span>

          <strong>{formatCurrency(totals.monthSalary)}</strong>
        </div>

        <div className="summary-card">
          <div className="summary-icon gross-icon">
            <i className="fa-solid fa-money-bill-trend-up"></i>
          </div>

          <span>Gross Salary</span>

          <strong>{formatCurrency(totals.grossSalary)}</strong>
        </div>

        <div className="summary-card">
          <div className="summary-icon ssnit-icon">
            <i className="fa-solid fa-shield-halved"></i>
          </div>

          <span>SSNIT 13%</span>

          <strong>{formatCurrency(totals.ssnit)}</strong>

          <small>Not deducted</small>
        </div>

        <div className="summary-card">
          <div className="summary-icon tax-icon">
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </div>

          <span>PAYE 5.5%</span>

          <strong>{formatCurrency(totals.payeTax)}</strong>

          <small>Deducted</small>
        </div>

        <div className="summary-card net-summary-card">
          <div className="summary-icon net-icon">
            <i className="fa-solid fa-wallet"></i>
          </div>

          <span>Net Salary</span>

          <strong>{formatCurrency(totals.netSalary)}</strong>
        </div>
      </div>

      {/* =================================================
          PAYSLIP TABLE
      ================================================= */}

      <div className="payslip-table-wrapper">
        <table className="payslip-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={allEmployeesSelected}
                  onChange={toggleSelectAll}
                  disabled={filteredPayrolls.length === 0}
                />
              </th>

              <th>#</th>

              <th>Employee</th>

              <th>Basic Salary</th>

              <th className="month-salary-header">Month Salary</th>

              <th>Allowance</th>

              <th>Gross Salary</th>

              <th>SSNIT 13%</th>

              <th>PAYE 5.5%</th>

              <th>Other Deduction</th>

              <th>Total Deduction</th>

              <th>Net Salary</th>
            </tr>
          </thead>

          <tbody>
            {filteredPayrolls.length === 0 ? (
              <tr>
                <td colSpan="12" className="empty-payslip">
                  <div className="empty-table-content">
                    <i className="fa-solid fa-users-slash"></i>

                    <strong>No employees found</strong>

                    <span>Try changing your search or payroll period.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPayrolls.map((payroll, index) => (
                <tr key={payroll.employeeId}>
                  {/* CHECKBOX */}

                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(
                        String(payroll.employeeId),
                      )}
                      onChange={() =>
                        toggleEmployeeSelection(payroll.employeeId)
                      }
                    />
                  </td>

                  {/* NUMBER */}

                  <td className="row-number">{index + 1}</td>

                  {/* EMPLOYEE */}

                  <td>
                    <div className="payslip-employee-cell">
                      <div className="employee-avatar">
                        {(payroll.firstName?.charAt(0) || "E").toUpperCase()}
                      </div>

                      <div className="employee-name-info">
                        <button
                          type="button"
                          className="employee-name-btn"
                          onClick={() =>
                            navigate(`/employees/${payroll.employeesId}`)
                          }
                        >
                          {payroll.firstName} {payroll.lastName}
                        </button>

                        <small>
                          {payroll.employeesId}
                          {" • "}
                          {payroll.email}
                        </small>
                      </div>
                    </div>
                  </td>

                  {/* BASIC SALARY */}

                  <td>{formatCurrency(payroll.originalMonthlySalary)}</td>

                  {/* =================================================
                        MONTH SALARY
                        
                        THIS IS EXACTLY THE SAME VALUE
                        USED BY Payroll.jsx.
                    ================================================= */}

                  <td>
                    <strong className="month-salary-value">
                      {formatCurrency(payroll.monthSalary)}
                    </strong>

                    <small className="attendance-days-info">
                      {payroll.daysWorked} days worked
                    </small>
                  </td>

                  {/* ALLOWANCE */}

                  <td>
                    <div className="currency-input">
                      <span>GH₵</span>

                      <input
                        type="number"
                        min="0"
                        className="payslip-edit-input"
                        value={payroll.allowances}
                        onChange={(event) =>
                          updatePayrollInput(
                            payroll.employeeId,
                            "allowance",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </td>

                  {/* GROSS */}

                  <td>
                    <strong>{formatCurrency(payroll.grossSalary)}</strong>
                  </td>

                  {/* SSNIT */}

                  <td>
                    <span className="ssnit-badge">
                      {formatCurrency(payroll.ssnit)}
                    </span>
                  </td>

                  {/* PAYE */}

                  <td>
                    <span className="paye-badge">
                      {formatCurrency(payroll.payeTax)}
                    </span>
                  </td>

                  {/* OTHER DEDUCTION */}

                  <td>
                    <div className="currency-input deduction-input">
                      <span>GH₵</span>

                      <input
                        type="number"
                        min="0"
                        className="payslip-edit-input"
                        value={payroll.otherDeductions}
                        onChange={(event) =>
                          updatePayrollInput(
                            payroll.employeeId,
                            "otherDeduction",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </td>

                  {/* TOTAL DEDUCTION */}

                  <td>{formatCurrency(payroll.totalDeductions)}</td>

                  {/* NET */}

                  <td>
                    <strong className="payslip-net">
                      {formatCurrency(payroll.netSalary)}
                    </strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* =================================================
              TOTAL
          ================================================= */}

          {filteredPayrolls.length > 0 && (
            <tfoot>
              <tr>
                <th colSpan="3" className="total-label">
                  TOTAL
                </th>

                <th>{formatCurrency(totals.basicSalary)}</th>

                <th className="total-month-salary">
                  {formatCurrency(totals.monthSalary)}
                </th>

                <th>{formatCurrency(totals.allowances)}</th>

                <th>{formatCurrency(totals.grossSalary)}</th>

                <th>{formatCurrency(totals.ssnit)}</th>

                <th>{formatCurrency(totals.payeTax)}</th>

                <th>{formatCurrency(totals.otherDeductions)}</th>

                <th>{formatCurrency(totals.totalDeductions)}</th>

                <th className="total-net">
                  {formatCurrency(totals.netSalary)}
                </th>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* =================================================
          ATTENDANCE NOTE
      ================================================= */}

      <div className="payslip-attendance-note">
        <div>
          <i className="fa-solid fa-circle-info"></i>

          <div>
            <strong>Month Salary is Attendance Based</strong>

            <p>
              Month Salary is the Payment amount obtained from the Monthly
              Attendance Payment calculation for {selectedMonth} {selectedYear}.
              It uses the employee's daily salary and days worked.
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          FOOTER ACTIONS
      ================================================= */}

      <div className="payslip-bottom-actions">
        <button
          type="button"
          className="back-payroll-btn"
          onClick={handleBackToPayroll}
          disabled={saving}
        >
          <i className="fa-solid fa-arrow-left"></i>
          Back to Payroll
        </button>

        <button
          type="button"
          className="save-payroll-btn"
          onClick={handleSavePayroll}
          disabled={saving}
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Saving Payroll...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk"></i>
              Save / Update Payroll
            </>
          )}
        </button>
      </div>

      {/* =================================================
          GENERATE SPECIFIC EMPLOYEE MODAL
      ================================================= */}

      {showGenerateModal && (
        <div
          className="payroll-modal-overlay"
          onClick={() => setShowGenerateModal(false)}
        >
          <div
            className="payroll-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="modal-header">
              <div>
                <div className="modal-title-icon">
                  <i className="fa-solid fa-user-gear"></i>
                </div>

                <div>
                  <h2>Generate Employee Payroll</h2>

                  <p>
                    {selectedMonth} {selectedYear}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowGenerateModal(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* BODY */}

            <div className="modal-body">
              <div className="modal-info">
                <i className="fa-solid fa-circle-info"></i>

                <span>
                  Enter allowances and other deductions for the selected
                  employees. Month Salary is automatically taken from
                  attendance.
                </span>
              </div>

              {selectedEmployeeIds.map((employeeId) => {
                const employee = employees.find(
                  (item) =>
                    String(item.employeesId ?? item.employeeId ?? item.id) ===
                    String(employeeId),
                );

                if (!employee) {
                  return null;
                }

                const input = generateInputs[employeeId] || {
                  allowance: 0,
                  otherDeduction: 0,
                };

                const employeeName =
                  `${employee.firstName ?? ""} ${
                    employee.lastName ?? ""
                  }`.trim() ||
                  employee.name ||
                  employee.fullName ||
                  "Employee";

                const attendancePayment = calculateAttendancePayment(employee);

                return (
                  <div className="generate-employee-row" key={employeeId}>
                    <div className="modal-employee-info">
                      <div className="modal-avatar">
                        {(employee.firstName?.charAt(0) || "E").toUpperCase()}
                      </div>

                      <div>
                        <strong>{employeeName}</strong>

                        <small>
                          {employee.employeesId ?? employee.id}
                          {" • "}
                          Month Salary:{" "}
                          {formatCurrency(attendancePayment.earnedSalary)}
                        </small>
                      </div>
                    </div>

                    <div className="modal-input-group">
                      <label>Allowance</label>

                      <div className="modal-currency-input">
                        <span>GH₵</span>

                        <input
                          type="number"
                          min="0"
                          value={input.allowance}
                          onChange={(event) =>
                            updateGenerateInput(
                              employeeId,
                              "allowance",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="modal-input-group">
                      <label>Other Deduction</label>

                      <div className="modal-currency-input">
                        <span>GH₵</span>

                        <input
                          type="number"
                          min="0"
                          value={input.otherDeduction}
                          onChange={(event) =>
                            updateGenerateInput(
                              employeeId,
                              "otherDeduction",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FOOTER */}

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-modal-btn"
                onClick={saveGeneratedInputs}
              >
                <i className="fa-solid fa-floppy-disk"></i>
                Save Inputs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payslip;
