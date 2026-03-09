import { useState, useEffect, useRef } from "react";
import Layout from "./Layout.jsx";
import Api from "../API/Api.js";
import { Html5Qrcode } from "html5-qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Camera,
  CameraOff,
  Save,
  Share2,
  RefreshCcw,
  FileText,
} from "lucide-react";

function DiarySearchScreenQR({ onLogout, username = "Unknown User" }) {
  const [diaryNumber, setDiaryNumber] = useState("");
  const [scannedDiaries, setScannedDiaries] = useState([]);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDiary, setActiveDiary] = useState(null);

  // Refs
  const html5QrCodeRef = useRef(null);
  const scanTimeoutRef = useRef(null); // used for message/restart timers
  const restartTimeoutRef = useRef(null); // separate restart timer
  const isTransitioningRef = useRef(false);
  const scannedDiariesRef = useRef([]); // reflects latest scannedDiaries
  const wakeLockRef = useRef(null);

  // keep scannedDiariesRef in sync with state so callbacks see latest value
  useEffect(() => {
    scannedDiariesRef.current = scannedDiaries;
  }, [scannedDiaries]);

  // 🔊 Play beep on scan success (keeps as baseline)
  const playBeep = () => {
    try {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.warn("Beep failed:", err);
    }
  };

  // ----- Wake Lock helpers -----
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        // optional: re-request if released (browser/platform specific)
        wakeLockRef.current.addEventListener("release", () => {
          console.log("Wake Lock released");
          wakeLockRef.current = null;
        });
        console.log("Wake Lock acquired");
      }
    } catch (err) {
      console.warn("Wake lock request failed:", err);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("Wake Lock released (manual)");
      }
    } catch (err) {
      console.warn("Failed to release wake lock:", err);
    }
  };

  // ✅ Safe scanner stop and clear
  const safeStopScanner = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      await html5QrCodeRef.current.clear();
      html5QrCodeRef.current = null;
      console.log("Scanner stopped and cleared");
    } catch (err) {
      console.error("Error stopping scanner:", err);
      // keep using setError same as baseline
      setError(
        "Failed to stop scanner: " + (err?.message || JSON.stringify(err)),
      );
    }
  };

  // 🧠 Start scanner (keeps baseline logic)
  const startScanner = async () => {
    if (isTransitioningRef.current) {
      console.log("Scanner transitioning, skip start");
      return;
    }

    const readerElement = document.getElementById("reader");
    if (!readerElement) {
      setError("Scanner container not found. Please try again.");
      console.error("Error: <div id='reader'> not found in DOM");
      return;
    }

    isTransitioningRef.current = true;
    console.log("Attempting to start scanner");

    try {
      // clear any previous reader content
      readerElement.innerHTML = "";

      // stop/clear any old instance
      await safeStopScanner();

      // create new instance
      html5QrCodeRef.current = new Html5Qrcode("reader");
      console.log("Html5Qrcode initialized");

      // request camera list
      let cameras;
      try {
        cameras = await Html5Qrcode.getCameras();
        console.log("Available cameras:", cameras);
      } catch (err) {
        setError(
          "Failed to access cameras: " + (err.message || JSON.stringify(err)),
        );
        console.error("Camera access error:", err);
        isTransitioningRef.current = false;
        return;
      }

      if (!cameras || cameras.length === 0) {
        setError("No cameras found on this device.");
        console.error("No cameras available");
        isTransitioningRef.current = false;
        return;
      }

      const rearCamera =
        cameras.find(
          (cam) =>
            cam.facingMode === "environment" ||
            cam.label.toLowerCase().includes("back") ||
            cam.label.toLowerCase().includes("rear"),
        ) || cameras[0];

      console.log("Selected camera:", rearCamera.label || rearCamera.id);

      const config = {
        fps: 5,
        qrbox: { width: 400, height: 400 },
        aspectRatio: 1.0,
        disableFlip: false,
        verbose: true,
      };

      // start camera and scanning
      try {
        await html5QrCodeRef.current.start(
          rearCamera.id,
          config,
          async (decodedText) => {
            if (!decodedText) return;

            console.log("Decoded QR:", decodedText);
            const diaryMatch = decodedText.match(
              /Diary Number\s*:\s*([A-Za-z0-9\/\-]+)/i,
            );

            if (!diaryMatch) {
              setError("Invalid QR code format. Please re-scan.");
              return;
            }

            const diary = diaryMatch[1];

            if (alreadyScanned) {
              // show duplicate message for a short time
              setError(`⚠️ Diary ${diary} already scanned.`);
              // clear any previous message timer
              if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
              }
              scanTimeoutRef.current = setTimeout(() => {
                setError("");
                scanTimeoutRef.current = null;
              }, 3000);
              return;
            }

            // Normal flow when not duplicate
            playBeep();
            setError("");
            setDiaryNumber(diary);

            // fetch details and append logic handled in fetchDiaryDetails
            fetchDiaryDetails(diary);

            // stop scanner temporarily to avoid overlapping fetches
            isTransitioningRef.current = true;
            try {
              await html5QrCodeRef.current.stop();
              await html5QrCodeRef.current.clear();
              html5QrCodeRef.current = null;
              console.log("Scanner stopped after successful scan");
            } catch (err) {
              console.error("Failed to stop scanner after scan:", err);
              setError(
                "Failed to stop scanner: " +
                  (err.message || JSON.stringify(err)),
              );
            }

            // restart scanner after short delay if scanning still true
            if (scanning) {
              // clear previous restart timer
              if (restartTimeoutRef.current)
                clearTimeout(restartTimeoutRef.current);
              restartTimeoutRef.current = setTimeout(() => {
                startScanner().catch((err) =>
                  console.error("Restart scanner error:", err),
                );
                restartTimeoutRef.current = null;
              }, 1500);
            }
            isTransitioningRef.current = false;
          },
          (errorMessage) => {
            // scan errors (non-fatal)
            console.warn("Scan error:", errorMessage);
          },
        );
        console.log("Scanner started successfully");
        // request wake lock after start
        await requestWakeLock();
        isTransitioningRef.current = false;
      } catch (err) {
        setError(
          "Failed to start scanner: " + (err.message || JSON.stringify(err)),
        );
        console.error("Scanner start error:", err);
        isTransitioningRef.current = false;
      }
    } catch (err) {
      const errorMessage =
        err.message || JSON.stringify(err) || "Unknown error";
      setError("Unable to initialize QR scanner: " + errorMessage);
      console.error("Scanner init error:", err);
      isTransitioningRef.current = false;
    }
  };

  // fetch diary details (keeps baseline)
  const fetchDiaryDetails = async (diary) => {
    setLoading(true);
    setError("");
    try {
      const response = await Api.getDiaryDetails({ diaryNumber: diary });
      if (!response || response?.message) {
        setError(response?.message || "Diary not found.");
      } else {
        setScannedDiaries((prev) => {
          const duplicate = prev.find(
            (d) => d.Diary_Number === response.Diary_Number,
          );
          return duplicate ? prev : [...prev, response];
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch diary details.");
    }
    setLoading(false);
  };

  // Start scanning button
  const handleStartScan = () => {
    setError("");
    setScanning(true);
  };

  // Stop scanning button
  const handleStopScan = async () => {
    setScanning(false);
    setError("");
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    await safeStopScanner();
    await releaseWakeLock();
  };

  // Remove diary
  const handleRemoveDiary = (index) => {
    setScannedDiaries((prev) => prev.filter((_, i) => i !== index));
    setActiveDiary(null);
  };

  const toggleDiaryDetails = (index) =>
    setActiveDiary(activeDiary === index ? null : index);

  // Save only (keeps baseline logic)
  const handleSaveOnly = async () => {
    if (!scannedDiaries.length) return alert("No diaries to save.");
    await safeStopScanner();
    await releaseWakeLock();
    try {
      const userData = JSON.parse(localStorage.getItem("user"))?.user;
      const diariesWithUser = scannedDiaries.map((diary) => ({
        ...diary,
        officerId: userData?.officerId,
        fullName: userData?.fullName,
        designation: userData?.designation,
        placeOfPosting: userData?.placeOfPosting,
      }));
      await Api.saveFileMovements({ diaries: diariesWithUser });
      alert("Saved successfully!");
      setScannedDiaries([]);
      // restart scanner if scanning was true before
      if (scanning) startScanner();
    } catch {
      alert("Failed to save. Try again.");
    }
  };

  // Save & Export (keeps baseline logic)
  const handleSaveAndExport = async () => {
    if (!scannedDiaries.length) return alert("No diaries to save/export.");
    await safeStopScanner();
    await releaseWakeLock();
    try {
      const userData = JSON.parse(localStorage.getItem("user"))?.user;
      const diariesWithUser = scannedDiaries.map((diary) => ({
        ...diary,
        officerId: userData?.officerId,
        fullName: userData?.fullName,
        designation: userData?.designation,
        placeOfPosting: userData?.placeOfPosting,
      }));
      await Api.saveFileMovements({ diaries: diariesWithUser });

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("File Received Report", 14, 20);
      doc.setFontSize(10);
      doc.text(
        `Received by: ${userData?.fullName || "N/A"} — ${
          userData?.designation || ""
        }`,
        14,
        28,
      );
      doc.text(`Place of Posting: ${userData?.placeOfPosting || ""}`, 14, 34);
      doc.text(`Date/Time: ${new Date().toLocaleString()}`, 14, 40);

      const tableData = scannedDiaries.map((item) => [
        item.Diary_Number,
        item.Case_Number,
        item.Branch,
        item.Institution_Date,
        item.X_CASE_NAME,
      ]);
      autoTable(doc, {
        startY: 45,
        head: [["Diary No", "Case No", "Branch", "Date", "Case Name"]],
        body: tableData,
      });
      doc.save(`diary_scan_${Date.now()}.pdf`);
      alert("Saved & exported successfully!");
      setScannedDiaries([]);
      if (scanning) startScanner();
    } catch {
      alert("Failed to save/export. Try again.");
    }
  };

  // lifecycle: start/stop scanner based on scanning flag
  useEffect(() => {
    if (scanning && !isTransitioningRef.current) startScanner();

    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      // best-effort cleanup
      safeStopScanner();
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  // --- UI (kept identical to your baseline layout) ---
  return (
    <Layout onLogout={onLogout}>
      <div className="flex flex-col min-h-screen bg-gray-100">
        <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 bg-white">
          <h4 className="text-lg font-bold mb-2">
            Scan to Record Case File Movement
          </h4>

          {scannedDiaries.length > 0 && (
            <div className="text-sm font-medium mb-2 p-2 bg-yellow-50 rounded border">
              Total Scanned Diaries: {scannedDiaries.length}
            </div>
          )}

          {error && (
            <div className="text-red-500 mb-2 p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-4 p-2 bg-white sticky top-14 z-10 shadow-sm rounded justify-start">
            {/* Mobile: icons only with custom tooltip */}
            <div className="flex sm:hidden gap-2 justify-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={handleStartScan}
                  className="p-2 bg-green-600 rounded text-white"
                >
                  <Camera size={20} />
                </button>
                <span className="text-xs mt-1 text-center">Start Scan</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handleStopScan}
                  className="p-2 bg-gray-500 rounded text-white"
                >
                  <CameraOff size={20} />
                </button>
                <span className="text-xs mt-1 text-center">Stop Scan</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handleSaveAndExport}
                  className="p-2 bg-blue-600 rounded text-white"
                >
                  <FileText size={20} />
                </button>
                <span className="text-xs mt-1 text-center">Save & Export</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handleSaveOnly}
                  className="p-2 bg-purple-600 rounded text-white"
                >
                  <Save size={20} />
                </button>
                <span className="text-xs mt-1 text-center">Save Only</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={() => setScannedDiaries([])}
                  className="p-2 bg-red-600 rounded text-white"
                >
                  <RefreshCcw size={20} />
                </button>
                <span className="text-xs mt-1 text-center">Reset</span>
              </div>
            </div>

            {/* Desktop: full buttons */}
            <div className="hidden sm:flex gap-2">
              <button
                onClick={handleStartScan}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
              >
                Start Scan
              </button>
              <button
                onClick={handleStopScan}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
              >
                Stop Scan
              </button>
              <button
                onClick={handleSaveAndExport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
              >
                Save & Export
              </button>
              <button
                onClick={handleSaveOnly}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm"
              >
                Save Only
              </button>
              <button
                onClick={() => setScannedDiaries([])}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Manual search */}
          <div className="flex flex-col gap-2 mb-4">
            <input
              type="text"
              value={diaryNumber}
              onChange={(e) => setDiaryNumber(e.target.value)}
              placeholder="Enter Diary Number (e.g., 91280/25)"
              className="border p-2 rounded text-base w-full"
            />
            <button
              onClick={() => fetchDiaryDetails(diaryNumber)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-base w-full"
            >
              Search Manually
            </button>
          </div>

          {/* Scanner */}
          {scanning && (
            <div className="mb-4 border-4 border-blue-400 rounded overflow-hidden w-full h-48 mx-auto relative">
              <div id="reader" className="w-full h-full"></div>
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse" />
            </div>
          )}

          {/* Table / Mobile cards */}
          {scannedDiaries.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block mt-4 border rounded-md bg-white w-full max-w-full box-border">
                <div className="text-sm font-medium p-2 bg-gray-100 border-b">
                  Scanned Diaries: {scannedDiaries.length}
                </div>
                <div
                  className="w-full overflow-x-auto"
                  style={{ maxHeight: "400px" }}
                >
                  <table className="w-full min-w-[500px] border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left border-b">Diary No</th>
                        <th className="p-2 text-left border-b">Case No</th>
                        <th className="p-2 text-left border-b">Branch</th>
                        <th className="p-2 text-left border-b">Date</th>
                        <th className="p-2 text-left border-b">Case Name</th>
                        <th className="p-2 text-center border-b">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedDiaries.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 border-b">{item.Diary_Number}</td>
                          <td className="p-2 border-b">{item.Case_Number}</td>
                          <td className="p-2 border-b">{item.Branch}</td>
                          <td className="p-2 border-b">
                            {item.Institution_Date}
                          </td>
                          <td className="p-2 border-b max-w-[150px] truncate">
                            {item.X_CASE_NAME}
                          </td>
                          <td className="p-2 border-b text-center">
                            <button
                              onClick={() => handleRemoveDiary(idx)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden mt-4 space-y-3">
                {scannedDiaries.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded shadow-sm border text-sm ${
                      idx % 2 === 0 ? "bg-blue-50" : "bg-green-50"
                    }`}
                  >
                    <div className="flex justify-between items-start font-medium text-xs">
                      <div className="flex gap-2">
                        <div>
                          <span className="font-semibold">Diary:</span>{" "}
                          {item.Diary_Number}
                        </div>
                        <div>
                          <span className="font-semibold">Case:</span>{" "}
                          {item.Case_Number}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveDiary(idx)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-semibold">Case Name:</span>{" "}
                      {item.X_CASE_NAME}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      <span className="font-semibold">Branch:</span>{" "}
                      {item.Branch} |{" "}
                      <span className="font-semibold">Date:</span>{" "}
                      {item.Institution_Date}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default DiarySearchScreenQR;
