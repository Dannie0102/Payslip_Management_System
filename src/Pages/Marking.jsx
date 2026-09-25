import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Marking.css";

const EMPLOYEES_API_URL = "http://localhost:3001/employees";
const ATTENDANCE_API_URL = "http://localhost:3001/attendance";

// Default times for Present attendance
const DEFAULT_CHECK_IN = "07:59";
const DEFAULT_CHECK_OUT = "17:00";

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getEmployeeName = (employee) =>
  `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

const getDefaultMarking = (employee, date) => ({
  employeeId: employee.employeesId,
  employeeName: getEmployeeName(employee),
  date,
  status: "Absent",
  checkIn: "",
  checkOut: "",
  notes: "",
});

const getStatusFromCheckIn = (checkIn) => {
  if (!checkIn) return "Absent";
  return checkIn > DEFAULT_CHECK_IN ? "Late" : "Present";
};

const Marking = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    location.state?.date || getToday(),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [markings, setMarkings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // LOAD EMPLOYEES AND ATTENDANCE
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [employeesResponse, attendanceResponse] = await Promise.all([
          fetch(EMPLOYEES_API_URL),
          fetch(ATTENDANCE_API_URL),
        ]);

        if (!employeesResponse.ok) {
          throw new Error("Failed to load employees.");
        }

        if (!attendanceResponse.ok) {
          throw new Error("Failed to load attendance.");
        }

        const employeesData = await employeesResponse.json();
        const attendanceData = await attendanceResponse.json();

        setEmployees(Array.isArray(employeesData) ? employeesData : []);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);

        const dateMarkings = {};

        employeesData.forEach((employee) => {
          const employeeId = employee.employeesId;

          const existingRecord = attendanceData.find(
            (record) =>
              String(record.employeeId) === String(employeeId) &&
              record.date === selectedDate,
          );

          dateMarkings[employeeId] = existingRecord
            ? {
                ...getDefaultMarking(employee, selectedDate),
                ...existingRecord,
                status: existingRecord.status || "Absent",
                checkIn: existingRecord.checkIn || "",
                checkOut: existingRecord.checkOut || "",
                notes: existingRecord.notes || "",
              }
            : getDefaultMarking(employee, selectedDate);
        });

        setMarkings(dateMarkings);
      } catch (err) {
        console.error("Error loading attendance:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate]);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredEmployees = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return employees;

    return employees.filter((employee) => {
      const fullName = getEmployeeName(employee).toLowerCase();
      const employeeId = String(employee.employeesId || "").toLowerCase();
      const email = String(employee.email || "").toLowerCase();

      return (
        fullName.includes(search) ||
        employeeId.includes(search) ||
        email.includes(search)
      );
    });
  }, [employees, searchTerm]);

  // =====================================================
  // HANDLE MARKING CHANGE
  // =====================================================

  const handleMarkingChange = (employee, field, value) => {
    const employeeId = employee.employeesId;

    setMarkings((previous) => {
      const current =
        previous[employeeId] || getDefaultMarking(employee, selectedDate);

      let updated = {
        ...current,
        employeeId,
        employeeName: getEmployeeName(employee),
        date: selectedDate,
        [field]: value,
      };

      // Selecting Present automatically uses 7:59 AM and 5:00 PM.
      if (field === "status" && value === "Present") {
        updated.status = "Present";
        updated.checkIn = DEFAULT_CHECK_IN;
        updated.checkOut = DEFAULT_CHECK_OUT;
      }

      // Selecting Absent or Leave clears time fields.
      if (field === "status" && (value === "Absent" || value === "Leave")) {
        updated.checkIn = "";
        updated.checkOut = "";
      }

      // Selecting Late keeps the check-in time editable. If there is no
      // check-in time yet, leave it empty so the user can enter the real time.
      if (field === "status" && value === "Late") {
        updated.status = "Late";
        updated.checkIn = updated.checkIn || "";
        updated.checkOut = updated.checkOut || "";
      }

      // Automatically determine status from check-in when the user edits it.
      if (field === "checkIn") {
        updated.status = getStatusFromCheckIn(value);

        if (updated.status === "Present") {
          updated.checkOut = updated.checkOut || DEFAULT_CHECK_OUT;
        }
      }

      // If a check-out is entered while status is Absent, use the check-in
      // to determine the appropriate status.
      if (field === "checkOut" && updated.status === "Absent") {
        if (updated.checkIn) {
          updated.status = getStatusFromCheckIn(updated.checkIn);
        }
      }

      return {
        ...previous,
        [employeeId]: updated,
      };
    });
  };

  // =====================================================
  // GET MARKING
  // =====================================================

  const getMarking = (employee) => {
    return (
      markings[employee.employeesId] ||
      getDefaultMarking(employee, selectedDate)
    );
  };

  // =====================================================
  // SAVE / UPDATE ATTENDANCE
  // =====================================================

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const recordsToSave = employees.map((employee) => {
        const marking = getMarking(employee);
        let status = marking.status || "Absent";

        if (status !== "Leave" && status !== "Absent") {
          status = getStatusFromCheckIn(marking.checkIn);

          // A manually selected Present record should retain the default
          // check-out time when no other value was entered.
          if (status === "Present" && !marking.checkOut) {
            marking.checkOut = DEFAULT_CHECK_OUT;
          }
        }

        return {
          ...marking,
          date: selectedDate,
          status,
          checkIn:
            status === "Present" || status === "Late"
              ? marking.checkIn || ""
              : "",
          checkOut:
            status === "Present" || status === "Late"
              ? marking.checkOut || ""
              : "",
          notes: marking.notes || "",
        };
      });

      for (const record of recordsToSave) {
        const existingRecord = attendance.find(
          (item) =>
            String(item.employeeId) === String(record.employeeId) &&
            item.date === selectedDate,
        );

        const attendanceData = {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          date: record.date,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          notes: record.notes,
        };

        let response;

        if (existingRecord?.id !== undefined) {
          response = await fetch(`${ATTENDANCE_API_URL}/${existingRecord.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(attendanceData),
          });
        } else {
          response = await fetch(ATTENDANCE_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(attendanceData),
          });
        }

        if (!response.ok) {
          throw new Error(
            `Failed to save attendance for ${record.employeeName}`,
          );
        }
      }

      // Reload saved records so IDs and data remain current.
      const updatedResponse = await fetch(ATTENDANCE_API_URL);

      if (updatedResponse.ok) {
        const updatedAttendance = await updatedResponse.json();
        setAttendance(updatedAttendance);

        const updatedMarkings = {};

        employees.forEach((employee) => {
          const record = updatedAttendance.find(
            (item) =>
              String(item.employeeId) === String(employee.employeesId) &&
              item.date === selectedDate,
          );

          updatedMarkings[employee.employeesId] = record
            ? {
                ...getDefaultMarking(employee, selectedDate),
                ...record,
              }
            : getDefaultMarking(employee, selectedDate);
        });

        setMarkings(updatedMarkings);
      }

      // Return to the Attendance page after a successful save.
      navigate("/attendance", {
        replace: true,
        state: {
          saved: true,
          message: "Attendance saved successfully.",
          date: selectedDate,
        },
      });
    } catch (err) {
      console.error("Error saving attendance:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // CANCEL
  // =====================================================

  const handleCancel = () => {
    navigate("/attendance");
  };

  // =====================================================
  // DAILY COUNTS
  // =====================================================

  const dailyMarkings = employees.map((employee) => getMarking(employee));

  const markedEmployees = dailyMarkings.length;

  const presentCount = dailyMarkings.filter(
    (item) => item.status === "Present",
  ).length;

  const absentCount = dailyMarkings.filter(
    (item) => item.status === "Absent",
  ).length;

  const lateCount = dailyMarkings.filter(
    (item) => item.status === "Late",
  ).length;

  const leaveCount = dailyMarkings.filter(
    (item) => item.status === "Leave",
  ).length;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="marking-page">
      <div className="marking-header">
        <div>
          <h1>Mark Attendance</h1>
          <p>Record employee attendance for the selected date.</p>
          <small>
            Default Present time: <strong>07:59 AM - 05:00 PM</strong>
          </small>
        </div>

        <button
          type="button"
          className="marking-back-btn"
          onClick={handleCancel}
        >
          <i className="fa-solid fa-arrow-left"></i>
          Back to Attendance
        </button>
      </div>

      {message && (
        <div className="marking-message success">
          <i className="fa-solid fa-circle-check"></i>
          {message}
        </div>
      )}

      {error && (
        <div className="marking-message error">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </div>
      )}

      <div className="marking-summary">
        <div className="marking-summary-card">
          <span>Total Employees</span>
          <strong>{employees.length}</strong>
        </div>

        <div className="marking-summary-card present">
          <span>Present</span>
          <strong>{presentCount}</strong>
        </div>

        <div className="marking-summary-card absent">
          <span>Absent</span>
          <strong>{absentCount}</strong>
        </div>

        <div className="marking-summary-card late">
          <span>Late</span>
          <strong>{lateCount}</strong>
        </div>

        <div className="marking-summary-card leave">
          <span>Leave</span>
          <strong>{leaveCount}</strong>
        </div>
      </div>

      <div className="marking-panel">
        <div className="marking-toolbar">
          <div className="marking-search">
            <i className="fa-solid fa-magnifying-glass"></i>

            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="marking-date">
            <label>Date</label>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="marking-table-container">
          <table className="marking-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Notes</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="marking-empty">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="marking-empty">
                    <i className="fa-solid fa-users-slash"></i>
                    <h3>No Employees Found</h3>
                    <p>Try changing your search.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const marking = getMarking(employee);

                  const disableTime =
                    marking.status === "Absent" || marking.status === "Leave";

                  return (
                    <tr key={employee.employeesId}>
                      <td>
                        <div className="marking-employee">
                          <div className="marking-avatar">
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
                        <span className="marking-employee-id">
                          {employee.employeesId}
                        </span>
                      </td>

                      <td>
                        <select
                          value={marking.status}
                          onChange={(e) =>
                            handleMarkingChange(
                              employee,
                              "status",
                              e.target.value,
                            )
                          }
                          className={`marking-status-select ${marking.status.toLowerCase()}`}
                        >
                          <option value="Absent">Absent</option>
                          <option value="Present">Present</option>
                          <option value="Late">Late</option>
                          <option value="Leave">Leave</option>
                        </select>
                      </td>

                      <td>
                        <input
                          type="time"
                          value={marking.checkIn}
                          disabled={disableTime}
                          onChange={(e) =>
                            handleMarkingChange(
                              employee,
                              "checkIn",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="time"
                          value={marking.checkOut}
                          disabled={disableTime}
                          onChange={(e) =>
                            handleMarkingChange(
                              employee,
                              "checkOut",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          placeholder="Optional note"
                          value={marking.notes}
                          onChange={(e) =>
                            handleMarkingChange(
                              employee,
                              "notes",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="marking-footer">
          <div className="marking-footer-info">
            {markedEmployees} employee
            {markedEmployees !== 1 ? "s" : ""}
          </div>

          <div className="marking-footer-actions">
            <button
              type="button"
              className="marking-cancel-btn"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="marking-save-btn"
              onClick={handleSaveAttendance}
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>
                  Save Attendance
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marking;
