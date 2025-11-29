import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState } from "react";

import Login from "./components/Login";

import DiarySearchScreen from "./components/DiarySearchScreenQR";
import UserDashboard from "./components/UserDashboard";
import DiaryTracking from "./components/DiaryTracking";
import MyFiles from "./components/MyFiles";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/DiarySearchScreenQR"
          element={
            <ProtectedRoute>
              <DiarySearchScreen onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/UserDashboard"
          element={
            <ProtectedRoute>
              <UserDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diaryTracking"
          element={
            <ProtectedRoute>
              <DiaryTracking onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/myFiles"
          element={
            <ProtectedRoute>
              <MyFiles onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
