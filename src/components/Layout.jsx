import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import Api from "../API/Api";

function MenuItem({ menu, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (menu.children?.length > 0) {
      setIsOpen(!isOpen);
    } else if (menu.Url) {
      onNavigate(menu.Url);
    }
  };

  return (
    <div className="mb-1">
      <div
        className="flex items-center px-3 py-2 text-gray-800 hover:bg-blue-100 cursor-pointer rounded-md transition-all duration-200"
        onClick={handleClick}
      >
        {menu.Icon && <i className={`${menu.Icon} mr-2 text-blue-500`}></i>}
        <span className="flex-grow text-sm font-medium">{menu.MenuName}</span>
        {menu.children?.length > 0 && (
          <i
            className={`fas fa-chevron-${isOpen ? "up" : "down"} text-gray-500`}
          ></i>
        )}
      </div>
      {isOpen && menu.children && (
        <div className="ml-4 pl-2 border-l border-blue-200">
          {menu.children.map((child) => (
            <MenuItem key={child.MenuID} menu={child} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function Layout({ children, onLogout }) {
  const [menus, setMenus] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        jwtDecode(token); // Validate token
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        setUser(stored.user || {});

        const menusData = await Api.getMenus();
        setMenus(menusData);
      } catch (err) {
        console.error("Error fetching menus:", err);
        navigate("/login");
      }
    };

    fetchMenus();
  }, [navigate]);

  const handleMenuNavigate = (url) => {
    setIsSidebarOpen(false);
    navigate(url);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    onLogout();
    navigate("/login");
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen flex bg-gray-100 relative">
      {/* Sidebar */}
      <aside
        className={`w-64 bg-white shadow-md fixed md:static inset-y-0 left-0 z-40 overflow-y-auto px-4 py-6 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <h2 className="text-xl font-bold text-blue-700 mb-6">📚 Menu</h2>
        <nav>
          {menus.length ? (
            menus.map((menu) => (
              <MenuItem
                key={menu.MenuID}
                menu={menu}
                onNavigate={handleMenuNavigate}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm">No menus available.</p>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-screen transition-all duration-300">
        {/* Header */}
        <header className="bg-white border-b shadow-sm px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-30">
          <h1 className="text-lg md:text-xl font-semibold text-blue-800">
            <span className="ml-10 block md:hidden">FTS</span>
            <span className="hidden md:inline">📁 File Tracking System</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 text-sm sm:text-base">
              👋 Welcome, <strong>{user.fullName}</strong>
              {user.designation && ` — ${user.designation}`}
              {user.placeOfPosting && ` @ ${user.placeOfPosting}`}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm shadow-sm"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-grow p-4 md:p-6 bg-gray-50 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-md shadow-md text-blue-600"
      >
        <FontAwesomeIcon icon={faBars} />
      </button>
    </div>
  );
}

export default Layout;
