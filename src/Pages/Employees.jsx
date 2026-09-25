import { useEffect, useState } from "react";
import "./Employees.css";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001/employees";

const Employees = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // =====================================================
  // PAGINATION
  // 10 employees per page
  // =====================================================
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  const initialFormState = {
    employeesId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    basicSalary: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // =====================================================
  // LOAD EMPLOYEES FROM JSON SERVER
  // =====================================================
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Failed to fetch employees");
        }

        const data = await response.json();
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetchEmployees();
  }, []);

  // =====================================================
  // HANDLE FORM INPUT
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // =====================================================
  // GET NEXT EMPLOYEE ID
  // =====================================================
  const getNextEmployeeId = (employeeList) => {
    const maxNum = employeeList.reduce((max, employee) => {
      const match = String(employee.employeesId).match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;

      return Math.max(max, num);
    }, 0);

    return `EMP${String(maxNum + 1).padStart(3, "0")}`;
  };

  // =====================================================
  // HANDLE ADD / EDIT EMPLOYEE
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // =================================================
      // UPDATE EMPLOYEE
      // =================================================
      if (editingId) {
        const employeeToUpdate = employees.find(
          (employee) => employee.employeesId === editingId,
        );

        if (!employeeToUpdate) {
          throw new Error("Employee not found.");
        }

        const updatedEmployee = {
          ...employeeToUpdate,
          employeesId: editingId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          basicSalary: formData.basicSalary,
        };

        const response = await fetch(
          `${API_URL}/${encodeURIComponent(employeeToUpdate.id)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedEmployee),
          },
        );

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const savedEmployee = await response.json();

        setEmployees((prev) =>
          prev.map((employee) =>
            employee.id === employeeToUpdate.id ? savedEmployee : employee,
          ),
        );
      } else {
        // =================================================
        // ADD EMPLOYEE
        // =================================================
        const newEmployee = {
          employeesId: getNextEmployeeId(employees),
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          basicSalary: formData.basicSalary,
        };

        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newEmployee),
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const savedEmployee = await response.json();

        setEmployees((prev) => [...prev, savedEmployee]);
      }

      closeModal();
    } catch (err) {
      console.error("Error saving employee:", err);
      alert(`Failed to save: ${err.message}`);
    }
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  // =====================================================
  // DELETE EMPLOYEE
  // =====================================================
  const handleDelete = async (employeesId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee?",
    );

    if (!confirmDelete) return;

    try {
      const employeeToDelete = employees.find(
        (employee) => employee.employeesId === employeesId,
      );

      if (!employeeToDelete) {
        throw new Error("Employee not found.");
      }

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(employeeToDelete.id)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      setEmployees((prev) =>
        prev.filter((employee) => employee.id !== employeeToDelete.id),
      );
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert(`Failed to delete: ${error.message}`);
    }
  };

  // =====================================================
  // EDIT EMPLOYEE
  // =====================================================
  const handleEdit = (employee) => {
    setFormData({
      employeesId: employee.employeesId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      basicSalary: employee.basicSalary,
    });

    setEditingId(employee.employeesId);
    setIsModalOpen(true);
  };

  // =====================================================
  // SEARCH / FILTER EMPLOYEES
  // =====================================================
  const filteredEmployees = employees.filter((employee) => {
    const search = searchTerm.toLowerCase();

    return (
      employee.firstName?.toLowerCase().includes(search) ||
      employee.lastName?.toLowerCase().includes(search) ||
      employee.employeesId?.toLowerCase().includes(search) ||
      employee.email?.toLowerCase().includes(search)
    );
  });

  // =====================================================
  // PAGINATION CALCULATIONS
  // =====================================================

  // Total number of pages
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  // Starting employee index
  const startIndex = (currentPage - 1) * employeesPerPage;

  // Ending employee index
  const endIndex = startIndex + employeesPerPage;

  // Employees displayed on current page
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  // =====================================================
  // RESET PAGE WHEN SEARCHING
  // =====================================================
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // =====================================================
  // KEEP PAGE VALID AFTER DELETE
  // =====================================================
  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(filteredEmployees.length / employeesPerPage),
    );

    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredEmployees.length, currentPage]);

  // =====================================================
  // GO TO PAGE
  // =====================================================
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="employees-page">
      {/* =================================================
          STATISTICS
      ================================================= */}
      <div className="employee-stats">
        {/* TOTAL EMPLOYEES */}
        <div className="employee-stat-card">
          <div className="stat-icon">
            <i className="fa-solid fa-user-group"></i>
          </div>

          <div>
            <span>Total Employees</span>
            <strong>{employees.length}</strong>
          </div>
        </div>

        {/* DEPARTMENTS */}
        <div className="employee-stat-card">
          <div className="stat-icon">
            <i className="fa-solid fa-calendar-days"></i>
          </div>

          <div>
            <span>Departments</span>

            <strong>
              {new Set(employees.map((employee) => employee.department)).size}
            </strong>
          </div>
        </div>

        {/* MONTHLY BASIC SALARY */}
        <div className="employee-stat-card">
          <div className="stat-icon">
            <i className="fa-solid fa-sack-dollar"></i>
          </div>

          <div>
            <span>Monthly Basic Salary</span>

            <strong>
              GHS{" "}
              {employees
                .reduce((total, employee) => {
                  const salary = Number(
                    String(employee.basicSalary).replace(/GHS/g, ""),
                  );

                  return total + salary;
                }, 0)
                .toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* =================================================
          EMPLOYEE TABLE
      ================================================= */}
      <div className="employees-panel">
        <div className="table-container">
          {/* =================================================
              SEARCH TOOLBAR
          ================================================= */}
          <div className="employees-toolbar">
            <div className="search-box">
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search by name, ID or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* =================================================
              PAGE HEADER
          ================================================= */}
          <div className="employees-header">
            <div>
              <h1>Employees</h1>

              <p>Manage employee information and salary details.</p>
            </div>

            <button
              className="add-employee-btn"
              onClick={() => {
                setEditingId(null);
                setFormData(initialFormState);
                setIsModalOpen(true);
              }}
            >
              + Add Employee
            </button>
          </div>

          {/* =================================================
              EMPLOYEE TABLE
          ================================================= */}
          <table className="employees-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Position</th>
                <th>Basic Salary</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.length > 0 ? (
                currentEmployees.map((employee) => (
                  <tr key={employee.employeesId}>
                    {/* EMPLOYEE */}
                    <td>
                      <div className="employee-name-cell">
                        <div className="employee-avatar">
                          {employee.firstName?.charAt(0).toUpperCase()}
                        </div>

                        <div className="employee-name-info">
                          <button
                            type="button"
                            className="employee-name-btn"
                            onClick={() =>
                              navigate(`/employees/${employee.employeesId}`)
                            }
                          >
                            {employee.firstName} {employee.lastName}
                          </button>

                          <small>{employee.email}</small>
                        </div>
                      </div>
                    </td>

                    {/* EMPLOYEE ID */}
                    <td>
                      <span className="employee-id">
                        {employee.employeesId}
                      </span>
                    </td>

                    {/* DEPARTMENT */}
                    <td>{employee.department}</td>

                    {/* POSITION */}
                    <td>{employee.position}</td>

                    {/* BASIC SALARY */}
                    <td>
                      GHS{" "}
                      {Number(
                        String(employee.basicSalary).replace(/GHS/g, ""),
                      ).toLocaleString()}
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="edit-btn"
                          title="Edit employee"
                          onClick={() => handleEdit(employee)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>

                        <button
                          type="button"
                          className="delete-btn"
                          title="Delete employee"
                          onClick={() => handleDelete(employee.employeesId)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-table">
                    <div className="empty-employees">
                      <div>
                        <i className="fa-solid fa-user-group"></i>
                      </div>

                      <h3>No Employees Found</h3>

                      <button
                        type="button"
                        className="add-employee-btn"
                        onClick={() => {
                          setEditingId(null);
                          setFormData(initialFormState);
                          setIsModalOpen(true);
                        }}
                      >
                        + Add Employee
                      </button>

                      <p>Add an employee to start managing your workforce.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* =================================================
              PAGINATION
          ================================================= */}
          {filteredEmployees.length > 0 && totalPages > 1 && (
            <div className="employees-pagination">
              {/* PAGINATION INFORMATION */}
              <div className="pagination-info">
                Showing {startIndex + 1}-
                {Math.min(endIndex, filteredEmployees.length)} of{" "}
                {filteredEmployees.length} employees
              </div>

              {/* PAGINATION BUTTONS */}
              <div className="pagination-controls">
                {/* PREVIOUS */}
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  Previous
                </button>

                {/* PAGE NUMBERS */}
                {Array.from(
                  {
                    length: totalPages,
                  },
                  (_, index) => index + 1,
                ).map((page) => (
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
                ))}

                {/* NEXT */}
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          ADD / EDIT EMPLOYEE MODAL
      ================================================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
            {/* MODAL HEADER */}
            <div className="modal-header">
              <div>
                <h2>{editingId ? "Edit Employee" : "Add Employee"}</h2>

                <p>
                  {editingId
                    ? "Update the employee's information below."
                    : "Enter the employee's information below."}
                </p>
              </div>

              <button
                type="button"
                className="close-modal"
                onClick={closeModal}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* EMPLOYEE ID */}
                <div className="form-group">
                  <label>Employee ID</label>

                  <input
                    type="text"
                    name="employeesId"
                    placeholder="Auto-generated"
                    value={formData.employeesId}
                    readOnly
                  />
                </div>

                {/* FIRST NAME */}
                <div className="form-group">
                  <label>First Name</label>

                  <input
                    type="text"
                    name="firstName"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* LAST NAME */}
                <div className="form-group">
                  <label>Last Name</label>

                  <input
                    type="text"
                    name="lastName"
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* EMAIL */}
                <div className="form-group">
                  <label>Email</label>

                  <input
                    type="email"
                    name="email"
                    placeholder="employee@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* PHONE */}
                <div className="form-group">
                  <label>Phone Number</label>

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* DEPARTMENT */}
                <div className="form-group">
                  <label>Department</label>

                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>
                      Select a department
                    </option>

                    <option value="Commerce & Logistics">
                      Commerce & Logistics
                    </option>

                    <option value="Research">Research</option>

                    <option value="Sale & Marketing">Sale & Marketing</option>

                    <option value="Information Technology">
                      Information Technology
                    </option>

                    <option value="Human Resource">Human Resource</option>

                    <option value="Finance">Finance</option>
                  </select>
                </div>

                {/* POSITION */}
                <div className="form-group">
                  <label>Position</label>

                  <input
                    type="text"
                    name="position"
                    placeholder="e.g. Software Developer"
                    value={formData.position}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* BASIC SALARY */}
                <div className="form-group">
                  <label>Basic Salary (GHS)</label>

                  <input
                    type="number"
                    name="basicSalary"
                    placeholder="Enter basic salary"
                    min="0"
                    value={formData.basicSalary}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button type="submit" className="save-employee-btn">
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
