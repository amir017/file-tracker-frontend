import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../API/Api";
import logo from "../assets/logo.png";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api.login(username, password);
      localStorage.setItem("token", data.token || "");
      localStorage.setItem("user", JSON.stringify(data.user || {}));
      onLogin?.();
      navigate("/DiarySearchScreenQR");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || "Login failed. Please try again.");
    }
  };

  return (
    <div
      className="
        min-h-[100dvh] w-full
        bg-white
        flex justify-center items-center
        p-0 m-0 overflow-hidden
        md:items-center
      "
    >
      {/* Card */}
      <div
        className="
          w-full max-w-md
          m-0
          md:m-0
          rounded-3xl border border-indigo-200
          bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50
          shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)]
          backdrop-blur
          flex flex-col
          justify-center
          px-4 sm:px-8 py-8 md:py-10
          h-[100dvh] md:h-auto
        "
      >
        <div className="text-center">
          {/* Logo */}
          <img
            src={logo}
            alt="Lahore High Court Logo"
            className="w-24 mx-auto mb-4 rounded-full shadow-lg"
          />

          {/* Title */}
          <h1 className="text-3xl font-bold mb-1 text-indigo-700">
            Lahore High Court
          </h1>

          {/* Subtitle */}
          <p className="text-indigo-500 mb-8 text-sm font-semibold">
            File Tracking System
          </p>

          {/* Error */}
          {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div>
              <label
                htmlFor="username"
                className="block text-indigo-700 mb-1 font-medium"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="
                  w-full p-3 rounded-lg bg-white
                  border-2 border-indigo-300
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                  outline-none transition
                "
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-indigo-700 mb-1 font-medium"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="
                  w-full p-3 rounded-lg bg-white
                  border-2 border-indigo-300
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                  outline-none transition
                "
              />
            </div>

            <button
              type="submit"
              className="
                w-full p-3 rounded-lg font-semibold text-white
                bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                shadow-md transition-transform duration-200 active:scale-[0.99]
              "
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
