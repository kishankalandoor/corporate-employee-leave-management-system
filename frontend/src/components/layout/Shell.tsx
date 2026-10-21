import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.js';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

export const Shell: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Unread notifications query
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; unreadCount: number }>('/notifications?unreadOnly=true');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.unreadCount ?? 0;

  const role = user?.role || 'employee';

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar */}
      <aside
        className={`bg-dark text-white d-flex flex-column flex-shrink-0 transition-all ${
          sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
        }`}
        style={{
          width: sidebarCollapsed ? '70px' : '260px',
          transition: 'width 0.2s ease-in-out',
          zIndex: 1000,
        }}
      >
        {/* Brand Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary border-opacity-25">
          {!sidebarCollapsed && (
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              <div
                className="bg-primary rounded-3 d-flex align-items-center justify-content-center text-white flex-shrink-0"
                style={{ width: '32px', height: '32px' }}
              >
                <i className="bi bi-calendar2-check-fill" aria-hidden="true" />
              </div>
              <div className="text-truncate">
                <span className="fw-bold text-white fs-6 d-block lh-1">Exelon LMS</span>
                <span className="text-secondary small" style={{ fontSize: '11px' }}>
                  Circuits Pvt. Ltd.
                </span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div
              className="bg-primary rounded-3 d-flex align-items-center justify-content-center text-white mx-auto"
              style={{ width: '32px', height: '32px' }}
            >
              <i className="bi bi-calendar2-check-fill" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="nav nav-pills flex-column p-2 gap-1 flex-grow-1 overflow-y-auto">
          {/* Employee Links */}
          <div className="sidebar-heading px-3 py-1 text-uppercase text-secondary fw-semibold small" style={{ fontSize: '11px' }}>
            {!sidebarCollapsed && 'Employee Workspace'}
          </div>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
              }`
            }
            title="Dashboard"
          >
            <i className="bi bi-speedometer2 fs-5" aria-hidden="true" />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </NavLink>

          <NavLink
            to="/leaves/apply"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
              }`
            }
            title="Apply for Leave"
          >
            <i className="bi bi-plus-circle fs-5" aria-hidden="true" />
            {!sidebarCollapsed && <span>Apply Leave</span>}
          </NavLink>

          <NavLink
            to="/leaves/my-requests"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
              }`
            }
            title="My Leave Requests"
          >
            <i className="bi bi-clock-history fs-5" aria-hidden="true" />
            {!sidebarCollapsed && <span>My Requests</span>}
          </NavLink>

          <NavLink
            to="/leaves/balances"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
              }`
            }
            title="Leave Balances"
          >
            <i className="bi bi-wallet2 fs-5" aria-hidden="true" />
            {!sidebarCollapsed && <span>Leave Balances</span>}
          </NavLink>

          <NavLink
            to="/leaves/calendar"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
              }`
            }
            title="Leave Calendar"
          >
            <i className="bi bi-calendar3 fs-5" aria-hidden="true" />
            {!sidebarCollapsed && <span>Leave Calendar</span>}
          </NavLink>

          <NavLink
            to="/holidays"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
              }`
            }
            title="Company Holiday & Working Day Calendar"
          >
            <i className="bi bi-calendar-event fs-5" aria-hidden="true" />
            {!sidebarCollapsed && <span>Holiday Calendar</span>}
          </NavLink>

          {/* Manager Section */}
          {(role === 'manager' || role === 'admin') && (
            <>
              <hr className="my-2 border-secondary border-opacity-25" />
              <div className="sidebar-heading px-3 py-1 text-uppercase text-secondary fw-semibold small" style={{ fontSize: '11px' }}>
                {!sidebarCollapsed && 'Management'}
              </div>

              <NavLink
                to="/approvals"
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                    isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
                  }`
                }
                title="Approvals"
              >
                <i className="bi bi-check2-circle fs-5" aria-hidden="true" />
                {!sidebarCollapsed && <span>Approvals</span>}
              </NavLink>

              <NavLink
                to="/approvals/history"
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                    isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
                  }`
                }
                title="Approval History"
              >
                <i className="bi bi-journal-check fs-5" aria-hidden="true" />
                {!sidebarCollapsed && <span>Approval History</span>}
              </NavLink>
            </>
          )}

          {/* Admin Section */}
          {role === 'admin' && (
            <>
              <hr className="my-2 border-secondary border-opacity-25" />
              <div className="sidebar-heading px-3 py-1 text-uppercase text-secondary fw-semibold small" style={{ fontSize: '11px' }}>
                {!sidebarCollapsed && 'Administration'}
              </div>

              <NavLink
                to="/admin/employees"
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                    isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
                  }`
                }
                title="Employee Directory"
              >
                <i className="bi bi-people fs-5" aria-hidden="true" />
                {!sidebarCollapsed && <span>Employees</span>}
              </NavLink>

              <NavLink
                to="/admin/departments"
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                    isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
                  }`
                }
                title="Departments"
              >
                <i className="bi bi-building fs-5" aria-hidden="true" />
                {!sidebarCollapsed && <span>Departments</span>}
              </NavLink>

              <NavLink
                to="/admin/policies"
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                    isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
                  }`
                }
                title="Leave Types & Policies"
              >
                <i className="bi bi-sliders fs-5" aria-hidden="true" />
                {!sidebarCollapsed && <span>Policies & Types</span>}
              </NavLink>

              <NavLink
                to="/admin/reports"
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                    isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
                  }`
                }
                title="Reports & Analytics"
              >
                <i className="bi bi-file-earmark-bar-graph fs-5" aria-hidden="true" />
                {!sidebarCollapsed && <span>Reports & Export</span>}
              </NavLink>

              <NavLink
                to="/admin/audit"
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-3 text-light rounded-2 py-2 px-3 ${
                    isActive ? 'active bg-primary text-white' : 'hover-bg-dark-light'
                  }`
                }
                title="Audit Trail"
              >
                <i className="bi bi-shield-check fs-5" aria-hidden="true" />
                {!sidebarCollapsed && <span>Audit Trail</span>}
              </NavLink>

              <a
                href="/grafana/"
                target="_blank"
                rel="noreferrer"
                className="nav-link d-flex align-items-center gap-3 text-warning rounded-2 py-2 px-3 hover-bg-dark-light"
                title="Grafana Observability & Metrics"
              >
                <i className="bi bi-speedometer2 fs-5 text-warning" aria-hidden="true" />
                {!sidebarCollapsed && (
                  <span className="d-flex align-items-center justify-content-between w-100">
                    <span>Grafana Metrics</span>
                    <i className="bi bi-box-arrow-up-right small text-warning opacity-75" style={{ fontSize: '11px' }} />
                  </span>
                )}
              </a>
            </>
          )}
        </nav>

        {/* User Mini Bar */}
        <div className="p-3 border-top border-secondary border-opacity-25 mt-auto">
          {!sidebarCollapsed ? (
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-semibold small flex-shrink-0"
                style={{ width: '34px', height: '34px' }}
              >
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="overflow-hidden flex-grow-1">
                <div className="text-white small fw-medium text-truncate">{user?.fullName}</div>
                <div className="text-secondary small text-uppercase" style={{ fontSize: '10px' }}>
                  {user?.role}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary p-0"
                onClick={logout}
                title="Logout"
              >
                <i className="bi bi-box-arrow-right fs-5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-link text-secondary p-0 w-100 text-center"
              onClick={logout}
              title="Logout"
            >
              <i className="bi bi-box-arrow-right fs-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        {/* Top Navbar */}
        <header className="navbar navbar-expand bg-white border-bottom px-3 py-2 shadow-sm">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary me-3"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle Sidebar"
          >
            <i className={`bi ${sidebarCollapsed ? 'bi-list' : 'bi-text-indent-left'} fs-5`} aria-hidden="true" />
          </button>

          <div className="d-none d-md-block text-secondary small fw-medium">
            <span className="text-muted">Portal</span> /{' '}
            <span className="text-dark fw-semibold text-capitalize">
              {location.pathname.replace(/^\//, '').replace(/\//g, ' / ') || 'Dashboard'}
            </span>
          </div>

          <div className="ms-auto d-flex align-items-center gap-3">
            {/* Notification bell */}
            <NavLink to="/notifications" className="btn btn-sm btn-light position-relative p-2" title="Notifications">
              <i className="bi bi-bell fs-5 text-secondary" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadCount}
                  <span className="visually-hidden">unread messages</span>
                </span>
              )}
            </NavLink>

            {/* User Dropdown */}
            <div className="dropdown position-relative">
              <button
                type="button"
                className="btn btn-sm btn-light d-flex align-items-center gap-2 border"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center small fw-semibold"
                  style={{ width: '28px', height: '28px' }}
                >
                  {user?.firstName?.[0]}
                </div>
                <span className="small fw-semibold d-none d-sm-inline">{user?.firstName}</span>
                <i className="bi bi-chevron-down small text-secondary" aria-hidden="true" />
              </button>

              {showUserMenu && (
                <div
                  className="dropdown-menu dropdown-menu-end show position-absolute shadow border-0 mt-2"
                  style={{ minWidth: '200px', zIndex: 1050 }}
                >
                  <div className="px-3 py-2 border-bottom">
                    <p className="small fw-semibold mb-0 text-dark">{user?.fullName}</p>
                    <p className="text-muted small mb-0 text-truncate">{user?.email}</p>
                    <span className="badge bg-primary-subtle text-primary mt-1 text-uppercase" style={{ fontSize: '10px' }}>
                      {user?.role}
                    </span>
                  </div>
                  <NavLink
                    to="/profile"
                    className="dropdown-item d-flex align-items-center gap-2 py-2"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <i className="bi bi-person text-secondary" aria-hidden="true" />
                    <span>My Profile</span>
                  </NavLink>
                  <div className="dropdown-divider my-1" />
                  <button
                    type="button"
                    className="dropdown-item d-flex align-items-center gap-2 text-danger py-2"
                    onClick={logout}
                  >
                    <i className="bi bi-box-arrow-right" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-grow-1 overflow-y-auto p-4 bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
