document.addEventListener("DOMContentLoaded", () => {
  // Element cache
  const $ = (id) => document.getElementById(id);
  const themeToggle = $("theme-toggle");
  const themeIconLight = $("theme-icon-light");
  const themeIconDark = $("theme-icon-dark");
  const jsonInput = $("json-input");
  const renderBtn = $("render-btn");
  const sampleDataBtn = $("sample-data-btn");
  const copyJsonBtn = $("copy-json-btn");
  const jsonError = $("json-error");
  const canvas = $("canvas");
  const canvasContainer = $("canvas-container");
  const toast = $("toast");
  const toastMessage = $("toast-message");
  const sidebar = $("sidebar");
  const sidebarToggle = $("sidebar-toggle");
  const sidebarClose = $("sidebar-close");
  const sidebarIconOpen = $("sidebar-icon-open");
  const sidebarIconClose = $("sidebar-icon-close");
  const mobileOverlay = $("mobile-overlay");
  const exportOverlay = $("export-overlay");
  const exportPngBtn = $("export-png-btn");
  const exportPdfBtn = $("export-pdf-btn");
  const zoomInBtn = $("zoom-in-btn");
  const zoomOutBtn = $("zoom-out-btn");
  const zoomResetBtn = $("zoom-reset-btn");
  const roadmapTitle = $("roadmap-title");

  let lines = [];
  let panzoomInstance;
  let currentData = null;

  // --- Utility ---
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  const isMobile = () => window.innerWidth < 768;

  // --- Theme Manager ---
  const applyTheme = (isDark) => {
    document.documentElement.classList.toggle("dark", isDark);
    themeIconLight.classList.toggle("hidden", !isDark);
    themeIconDark.classList.toggle("hidden", isDark);
    setTimeout(updateLines, 50);
  };

  themeToggle.addEventListener("click", () => {
    const isDark = !document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    applyTheme(isDark);
  });

  // --- Initial Setup ---
  applyTheme(localStorage.getItem("theme") === "dark");

  // --- Mobile Sidebar Management ---
  const openSidebar = () => {
    sidebar.classList.add("open");
    sidebar.classList.remove("hidden");
    mobileOverlay.classList.add("active");
    sidebarIconOpen.classList.add("hidden");
    sidebarIconClose.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };

  const closeSidebar = () => {
    sidebar.classList.remove("open");
    if (isMobile()) {
      sidebar.classList.add("hidden");
    }
    mobileOverlay.classList.remove("active");
    sidebarIconOpen.classList.remove("hidden");
    sidebarIconClose.classList.add("hidden");
    document.body.style.overflow = "";
    setTimeout(updateLines, 300);
  };

  sidebarToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  sidebarClose.addEventListener("click", closeSidebar);
  mobileOverlay.addEventListener("click", closeSidebar);

  // Handle window resize
  window.addEventListener(
    "resize",
    debounce(() => {
      if (!isMobile()) {
        sidebar.classList.remove("hidden", "open");
        mobileOverlay.classList.remove("active");
        document.body.style.overflow = "";
      } else if (!sidebar.classList.contains("open")) {
        sidebar.classList.add("hidden");
      }
      updateLines();
    }, 150)
  );

  // --- Sample Data ---
  const sampleJSON = {
    title: "Frontend Development Roadmap 2025",
    theme: "linear",
    nodes: [
      {
        id: "html_css",
        title: "HTML & CSS",
        description: "Fundamentals of web structure and styling.",
        status: "completed",
        level: 0,
      },
      {
        id: "js_basics",
        title: "JavaScript Basics",
        description: "Core language features, DOM manipulation.",
        status: "completed",
        level: 1,
      },
      {
        id: "git",
        title: "Version Control (Git)",
        description: "Tracking changes and collaborating with teams.",
        status: "completed",
        level: 1,
      },
      {
        id: "framework",
        title: "Choose a Framework",
        description: "React, Vue, or Angular for building complex UIs.",
        status: "in-progress",
        level: 2,
      },
      {
        id: "react",
        title: "React.js",
        description: "Component-based architecture and state management.",
        status: "in-progress",
        level: 3,
      },
      {
        id: "vue",
        title: "Vue.js",
        description: "Approachable, performant, and versatile framework.",
        status: "planned",
        level: 3,
      },
      {
        id: "styling",
        title: "Advanced CSS",
        description: "CSS-in-JS, TailwindCSS, SASS.",
        status: "in-progress",
        level: 4,
      },
      {
        id: "testing",
        title: "Testing",
        description: "Jest, React Testing Library for robust apps.",
        status: "planned",
        level: 5,
      },
      {
        id: "typescript",
        title: "TypeScript",
        description: "Adding static types to JavaScript.",
        status: "planned",
        level: 5,
      },
      {
        id: "deployment",
        title: "Deployment & CI/CD",
        description: "Automating builds and deploying to production.",
        status: "planned",
        level: 6,
      },
    ],
    dependencies: [
      { from: "html_css", to: "js_basics" },
      { from: "js_basics", to: "framework" },
      { from: "js_basics", to: "git" },
      { from: "framework", to: "react" },
      { from: "framework", to: "vue" },
      { from: "react", to: "styling" },
      { from: "react", to: "testing" },
      { from: "styling", to: "deployment" },
      { from: "testing", to: "typescript" },
    ],
  };
  jsonInput.value = JSON.stringify(sampleJSON, null, 2);

  // --- Toast Notification ---
  const showToast = (message, duration = 3000) => {
    toastMessage.textContent = message;
    toast.classList.remove("translate-y-20", "opacity-0");
    setTimeout(() => {
      toast.classList.add("translate-y-20", "opacity-0");
    }, duration);
  };

  const displayCanvasMessage = (message) => {
    canvas.innerHTML = `<div class="w-full h-full flex items-center justify-center p-4 sm:p-8">
                    <p class="text-slate-500 dark:text-slate-400 text-center text-sm sm:text-base max-w-md">${message}</p>
                </div>`;
  };

  // --- Roadmap Rendering ---
  const renderRoadmap = () => {
    jsonError.textContent = "";
    canvas.innerHTML = "";
    lines.forEach((line) => line.remove());
    lines = [];
    roadmapTitle.textContent = "";

    let data;
    try {
      if (jsonInput.value.trim() === "") {
        displayCanvasMessage(
          "Paste your JSON in the sidebar to generate a roadmap."
        );
        return;
      }
      data = JSON.parse(jsonInput.value);
    } catch (e) {
      jsonError.textContent = "Invalid JSON format.";
      showToast("Error: Could not parse the JSON.");
      displayCanvasMessage("Could not render roadmap due to invalid JSON.");
      return;
    }

    if (
      !data.nodes ||
      !Array.isArray(data.nodes) ||
      !data.dependencies ||
      !Array.isArray(data.dependencies)
    ) {
      jsonError.textContent =
        'JSON must contain "nodes" and "dependencies" arrays.';
      displayCanvasMessage(
        'Invalid roadmap structure. Make sure "nodes" and "dependencies" arrays exist.'
      );
      return;
    }

    if (data.nodes.length === 0) {
      displayCanvasMessage(
        "Your roadmap is empty. Add some nodes to the JSON configuration."
      );
      return;
    }

    currentData = data;
    roadmapTitle.textContent = data.title ? `: ${data.title}` : "";

    const levels = data.nodes.reduce((acc, node) => {
      (acc[node.level] = acc[node.level] || []).push(node);
      return acc;
    }, {});

    const sortedLevels = Object.keys(levels).sort((a, b) => a - b);

    sortedLevels.forEach((level, levelIndex) => {
      const levelContainer = document.createElement("div");
      levelContainer.className =
        "flex flex-col items-center gap-4 sm:gap-6 md:gap-8 p-4 sm:p-6 md:p-10";
      levelContainer.style.animationDelay = `${levelIndex * 100}ms`;
      levelContainer.classList.add("fade-in");

      // Add level indicator for better mobile experience
      if (levels[level].length > 1 || sortedLevels.length > 3) {
        const levelIndicator = document.createElement("div");
        levelIndicator.className =
          "text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 mb-2";
        levelIndicator.textContent = `Level ${level}`;
        levelContainer.appendChild(levelIndicator);
      }

      const nodesContainer = document.createElement("div");
      nodesContainer.className = isMobile()
        ? "flex flex-col items-center gap-4 w-full"
        : "flex flex-row justify-center items-start gap-6 lg:gap-8 flex-wrap";

      levels[level].forEach((nodeData) => {
        const nodeEl = document.createElement("div");
        nodeEl.id = nodeData.id;
        nodeEl.className = isMobile()
          ? "node w-full max-w-sm p-4 rounded-xl shadow-lg cursor-pointer flex flex-col gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          : "node w-64 lg:w-72 p-5 rounded-xl shadow-lg cursor-pointer flex flex-col gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700";

        const statusColor = `status-${nodeData.status || "planned"}`;
        const statusLabels = {
          completed: "Completed",
          "in-progress": "In Progress",
          planned: "Planned",
          "on-hold": "On Hold",
        };

        nodeEl.innerHTML = `
                            <div class="flex items-start justify-between gap-2">
                                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex-1">${
                                  nodeData.title
                                }</h3>
                                <div class="w-3 h-3 rounded-full ${statusColor} shrink-0 mt-1" title="Status: ${
          statusLabels[nodeData.status] || "Planned"
        }"></div>
                            </div>
                            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">${
                              nodeData.description
                            }</p>
                        `;
        nodesContainer.appendChild(nodeEl);
      });

      levelContainer.appendChild(nodesContainer);
      canvas.appendChild(levelContainer);
    });

    requestAnimationFrame(() => {
      if (panzoomInstance) panzoomInstance.dispose();
      panzoomInstance = panzoom(canvas, {
        maxZoom: 3,
        minZoom: 0.1,
        filterKey: () => true,
        smoothScroll: false,
        zoomDoubleClickSpeed: 1,
      });
      canvasContainer.addEventListener("wheel", panzoomInstance.zoomWithWheel);
      panzoomInstance.on("pan", debounce(updateLines, 30));
      panzoomInstance.on("zoom", debounce(updateLines, 30));

      // Delay line drawing to ensure DOM is fully rendered
      setTimeout(drawLines, 100);
    });
  };

  function drawLines() {
    lines.forEach((line) => line.remove());
    lines = [];

    if (!currentData || !currentData.dependencies) return;

    const isDark = document.documentElement.classList.contains("dark");
    const lineColor = isDark
      ? "rgba(100, 116, 139, 0.8)"
      : "rgba(148, 163, 184, 0.8)";

    currentData.dependencies.forEach((dep) => {
      const fromEl = $(dep.from);
      const toEl = $(dep.to);
      if (fromEl && toEl) {
        try {
          const line = new LeaderLine(fromEl, toEl, {
            color: lineColor,
            size: isMobile() ? 2 : 3,
            path: "fluid",
            startSocket: "bottom",
            endSocket: "top",
            startPlug: "disc",
            endPlug: "arrow1",
            dash: { animation: true },
            gradient: true,
            dropShadow: {
              dx: 0,
              dy: 2,
              blur: 4,
              color: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)",
            },
          });
          lines.push(line);
        } catch (e) {
          console.error("Could not draw line:", e);
        }
      }
    });
  }

  function updateLines() {
    const isDark = document.documentElement.classList.contains("dark");
    const lineColor = isDark
      ? "rgba(100, 116, 139, 0.8)"
      : "rgba(148, 163, 184, 0.8)";

    lines.forEach((line) => {
      try {
        line.color = lineColor;
        line.size = isMobile() ? 2 : 3;
        line.position();
      } catch (e) {
        // Line might be invalid if nodes were removed
      }
    });
  }

  // --- Event Listeners ---
  renderBtn.addEventListener("click", () => {
    renderRoadmap();
    if (isMobile()) {
      closeSidebar();
    }
  });

  sampleDataBtn.addEventListener("click", () => {
    jsonInput.value = JSON.stringify(sampleJSON, null, 2);
    renderRoadmap();
    showToast("Sample data loaded!");
    if (isMobile()) {
      closeSidebar();
    }
  });

  copyJsonBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(jsonInput.value)
      .then(() => {
        showToast("JSON copied to clipboard!");
      })
      .catch(() => {
        // Fallback for older browsers
        jsonInput.select();
        document.execCommand("copy");
        showToast("JSON copied to clipboard!");
      });
  });

  // Zoom controls
  zoomInBtn.addEventListener("click", () => {
    if (panzoomInstance) {
      panzoomInstance.smoothZoom(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2,
        1.2
      );
    }
  });

  zoomOutBtn.addEventListener("click", () => {
    if (panzoomInstance) {
      panzoomInstance.smoothZoom(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2,
        0.8
      );
    }
  });

  zoomResetBtn.addEventListener("click", () => {
    if (!panzoomInstance) return;
    panzoomInstance.moveTo(0, 0);
    panzoomInstance.zoomAbs(0, 0, 1);
    setTimeout(updateLines, 100);
  });

  // --- Enhanced Export Functionality ---
  const showExportOverlay = () => {
    exportOverlay.classList.add("active");
  };

  const hideExportOverlay = () => {
    exportOverlay.classList.remove("active");
  };

  const prepareCanvasForExport = async () => {
    // Reset zoom and position
    if (panzoomInstance) {
      panzoomInstance.moveTo(0, 0);
      panzoomInstance.zoomAbs(0, 0, 1);
    }

    // Temporarily disable hover effects and transitions
    const nodes = document.querySelectorAll(".node");
    nodes.forEach((node) => {
      node.style.transition = "none";
      node.style.transform = "none";
    });

    // Wait for positioning to settle
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Force line redraw
    updateLines();
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  const restoreCanvasAfterExport = () => {
    // Re-enable transitions
    const nodes = document.querySelectorAll(".node");
    nodes.forEach((node) => {
      node.style.transition = "";
      node.style.transform = "";
    });
  };

  exportPngBtn.addEventListener("click", async () => {
    if (!currentData || !currentData.nodes.length) {
      showToast("Please generate a roadmap first!");
      return;
    }

    showExportOverlay();

    try {
      await prepareCanvasForExport();

      // Create a temporary container that includes both canvas and lines
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.top = "-9999px";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = canvas.scrollWidth + "px";
      tempContainer.style.height = canvas.scrollHeight + "px";
      tempContainer.style.backgroundColor =
        document.documentElement.classList.contains("dark")
          ? "#020617"
          : "#f1f5f9";

      // Clone canvas content
      const canvasClone = canvas.cloneNode(true);
      tempContainer.appendChild(canvasClone);

      // Add SVG overlay for lines
      const svgOverlay = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svgOverlay.style.position = "absolute";
      svgOverlay.style.top = "0";
      svgOverlay.style.left = "0";
      svgOverlay.style.width = "100%";
      svgOverlay.style.height = "100%";
      svgOverlay.style.pointerEvents = "none";
      svgOverlay.style.zIndex = "1";

      // Draw lines as SVG paths
      lines.forEach((line) => {
        try {
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          const lineElement = line.element;
          if (lineElement) {
            const pathData = lineElement.getAttribute("d");
            if (pathData) {
              path.setAttribute("d", pathData);
              path.setAttribute("stroke", line.color);
              path.setAttribute("stroke-width", line.size);
              path.setAttribute("fill", "none");
              path.setAttribute("stroke-linecap", "round");
              path.setAttribute("stroke-linejoin", "round");
              svgOverlay.appendChild(path);
            }
          }
        } catch (e) {
          console.warn("Could not export line:", e);
        }
      });

      tempContainer.appendChild(svgOverlay);
      document.body.appendChild(tempContainer);

      const canvasImage = await html2canvas(tempContainer, {
        backgroundColor: document.documentElement.classList.contains("dark")
          ? "#020617"
          : "#f1f5f9",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight,
      });

      document.body.removeChild(tempContainer);

      const link = document.createElement("a");
      link.download = `${currentData.title || "roadmap"}.png`.replace(
        /[^a-z0-9]/gi,
        "_"
      );
      link.href = canvasImage.toDataURL("image/png");
      link.click();

      showToast("PNG exported successfully!");
    } catch (err) {
      showToast("Error exporting PNG. Please try again.");
      console.error("Export error:", err);
    } finally {
      hideExportOverlay();
      restoreCanvasAfterExport();
    }
  });

  exportPdfBtn.addEventListener("click", async () => {
    if (!currentData || !currentData.nodes.length) {
      showToast("Please generate a roadmap first!");
      return;
    }

    showExportOverlay();

    try {
      await prepareCanvasForExport();

      const { jsPDF } = window.jspdf;

      // Create temporary container for export
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.top = "-9999px";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = canvas.scrollWidth + "px";
      tempContainer.style.height = canvas.scrollHeight + "px";
      tempContainer.style.backgroundColor =
        document.documentElement.classList.contains("dark")
          ? "#020617"
          : "#f1f5f9";

      const canvasClone = canvas.cloneNode(true);
      tempContainer.appendChild(canvasClone);

      // Add SVG overlay for lines
      const svgOverlay = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svgOverlay.style.position = "absolute";
      svgOverlay.style.top = "0";
      svgOverlay.style.left = "0";
      svgOverlay.style.width = "100%";
      svgOverlay.style.height = "100%";
      svgOverlay.style.pointerEvents = "none";
      svgOverlay.style.zIndex = "1";

      lines.forEach((line) => {
        try {
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          const lineElement = line.element;
          if (lineElement) {
            const pathData = lineElement.getAttribute("d");
            if (pathData) {
              path.setAttribute("d", pathData);
              path.setAttribute("stroke", line.color);
              path.setAttribute("stroke-width", line.size);
              path.setAttribute("fill", "none");
              path.setAttribute("stroke-linecap", "round");
              path.setAttribute("stroke-linejoin", "round");
              svgOverlay.appendChild(path);
            }
          }
        } catch (e) {
          console.warn("Could not export line:", e);
        }
      });

      tempContainer.appendChild(svgOverlay);
      document.body.appendChild(tempContainer);

      const canvasImage = await html2canvas(tempContainer, {
        backgroundColor: document.documentElement.classList.contains("dark")
          ? "#020617"
          : "#f1f5f9",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight,
      });

      document.body.removeChild(tempContainer);

      const imgData = canvasImage.toDataURL("image/png");
      const imgWidth = 297; // A4 width in mm
      const pageHeight = 210; // A4 height in mm
      const imgHeight = (canvasImage.height * imgWidth) / canvasImage.width;
      let heightLeft = imgHeight;

      const doc = new jsPDF("l", "mm", "a4"); // Landscape orientation
      let position = 0;

      doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(
        `${currentData.title || "roadmap"}.pdf`.replace(/[^a-z0-9]/gi, "_")
      );
      showToast("PDF exported successfully!");
    } catch (err) {
      showToast("Error exporting PDF. Please try again.");
      console.error("Export error:", err);
    } finally {
      hideExportOverlay();
      restoreCanvasAfterExport();
    }
  });

  // Initialize mobile view
  if (isMobile()) {
    sidebar.classList.add("hidden");
  }

  // Initial render
  renderRoadmap();
});
