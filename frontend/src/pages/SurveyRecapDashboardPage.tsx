import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  BarChart3,
  CalendarDays,
  MessageSquare,
  SmilePlus,
  TrendingUp,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  LayoutDashboard,
  MousePointerClick,
  Settings,
  Users,
  ScrollText,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { getConfig, getCustomerSatisfaction, type SurveyRow } from "../api";
import { useAuth } from "../context/AuthContext";

type SatisfactionOption = "Sangat Puas" | "Puas" | "Kurang Puas" | "Tidak Puas";

type SurveyItem = SurveyRow;

const SAT_ORDER: SatisfactionOption[] = [
  "Sangat Puas",
  "Puas",
  "Kurang Puas",
  "Tidak Puas",
];

const SAT_SCORE: Record<SatisfactionOption, number> = {
  "Sangat Puas": 4,
  Puas: 3,
  "Kurang Puas": 2,
  "Tidak Puas": 1,
};

const SAT_COLOR: Record<SatisfactionOption, string> = {
  "Sangat Puas": "bg-emerald-500",
  Puas: "bg-cyan-500",
  "Kurang Puas": "bg-amber-500",
  "Tidak Puas": "bg-rose-500",
};

const SAT_LABEL_COLOR: Record<SatisfactionOption, string> = {
  "Sangat Puas": "text-emerald-700",
  Puas: "text-cyan-700",
  "Kurang Puas": "text-amber-700",
  "Tidak Puas": "text-rose-700",
};

const MOBILE_DOT_FLASH_MS = 280;
const MOBILE_EDGE_PULSE_MS = 280;
const MOBILE_LIST_EXIT_MS = 180;
const MOBILE_LIST_ENTER_MS = 320;
const MOBILE_LIST_EXIT_EASING = "cubic-bezier(0.4, 0, 1, 1)";
const MOBILE_LIST_ENTER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function fmtDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toYmdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function SurveyRecapDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [officeName, setOfficeName] = useState("ULP Salatiga");
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [tableQuery, setTableQuery] = useState("");
  const [tableFilterSat, setTableFilterSat] = useState<
    "all" | SatisfactionOption
  >("all");
  const [tableSort, setTableSort] = useState<
    | "date_desc"
    | "date_asc"
    | "phone_asc"
    | "phone_desc"
    | "sat_desc"
    | "sat_asc"
  >("date_desc");
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileMotionTick, setMobileMotionTick] = useState(0);
  const [isTrendChartVisible, setIsTrendChartVisible] = useState(false);
  const [isMobileListVisible, setIsMobileListVisible] = useState(false);
  const [mobileListPhase, setMobileListPhase] = useState<
    "idle" | "exiting" | "entering"
  >("idle");
  const [mobileDragOffset, setMobileDragOffset] = useState(0);
  const [isActiveDotFlashing, setIsActiveDotFlashing] = useState(false);
  const [mobileSlideDirection, setMobileSlideDirection] = useState<
    "left" | "right" | null
  >(null);
  const [showLeftEdgeHint, setShowLeftEdgeHint] = useState(false);
  const [showRightEdgeHint, setShowRightEdgeHint] = useState(false);
  const [edgePulseSide, setEdgePulseSide] = useState<"left" | "right" | null>(
    null,
  );
  const [mobileRenderedRows, setMobileRenderedRows] = useState<SurveyItem[]>(
    [],
  );
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const swipeAxisLockRef = useRef<"x" | "y" | null>(null);
  const previousMobilePageRef = useRef(1);
  const hasInitializedMobileListRef = useRef(false);
  const edgePulseTimeoutRef = useRef<number | null>(null);

  const navGroups = [
    {
      label: "Manajemen Antrean",
      items: [
        { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        {
          name: "Kendali Antrean",
          path: "/admin/queue",
          icon: MousePointerClick,
        },
        { name: "Konfigurasi Layanan", path: "/admin/config", icon: Settings },
      ],
    },
    {
      label: "Pengguna & Sistem",
      items: [
        { name: "Manajemen Pengguna", path: "/admin/users", icon: Users },
        { name: "Log Sistem", path: "/admin/logs", icon: ScrollText },
      ],
    },
    {
      label: "Survey & Analitik",
      items: [
        {
          name: "Dashboard Survey",
          path: "/survey-kepuasan-dashboard",
          icon: BarChart3,
        },
      ],
    },
  ];

  const initials = (name?: string) =>
    (name || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const fetchSurveys = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const data = await getCustomerSatisfaction(500);
      if (Array.isArray(data)) {
        setSurveys(data as SurveyItem[]);
        setLastUpdated(new Date());
        setMobileMotionTick((tick) => tick + 1);
      }
    } catch {
      setSurveys([]);
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const runFetch = async () => {
      if (!active) return;
      await fetchSurveys(false);
    };

    runFetch();
    const interval = setInterval(runFetch, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchSurveys]);

  useEffect(() => {
    getConfig()
      .then((data) => {
        if (data?.officeName) setOfficeName(data.officeName);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobilePage(1);
  }, [tableQuery, tableFilterSat, tableSort]);

  const stats = useMemo(() => {
    const total = surveys.length;
    const bySatisfaction: Record<SatisfactionOption, number> = {
      "Sangat Puas": 0,
      Puas: 0,
      "Kurang Puas": 0,
      "Tidak Puas": 0,
    };

    let scoreSum = 0;
    let withFeedback = 0;
    const byDate: Record<string, number> = {};

    for (const s of surveys) {
      if (SAT_ORDER.includes(s.satisfaction)) {
        bySatisfaction[s.satisfaction] += 1;
        scoreSum += SAT_SCORE[s.satisfaction];
      }
      if (s.feedback && s.feedback.trim()) withFeedback += 1;
      const rawDate = s.createdAt || s.inputDate;
      let key = "Tanpa Tanggal";
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) {
          key = toYmdLocal(parsed);
        }
      }
      byDate[key] = (byDate[key] || 0) + 1;
    }

    const positive = bySatisfaction["Sangat Puas"] + bySatisfaction["Puas"];
    const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;
    const avgScore = total > 0 ? scoreSum / total : 0;
    const index = total > 0 ? Math.round((avgScore / 4) * 100) : 0;

    const today = new Date();
    const todayKey = toYmdLocal(today);
    const todayCount = byDate[todayKey] || 0;

    const trend = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - idx));
      const key = toYmdLocal(d);
      return {
        key,
        dayLabel: d.toLocaleDateString("id-ID", { weekday: "short" }),
        dateLabel: d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
        }),
        count: byDate[key] || 0,
      };
    });

    const trendTotal = trend.reduce((sum, t) => sum + t.count, 0);
    const trendAverage = Math.round((trendTotal / trend.length) * 10) / 10;
    const peakCount = Math.max(0, ...trend.map((t) => t.count));
    const peakDays = trend.filter(
      (t) => t.count === peakCount && peakCount > 0,
    );
    const peakLabel =
      peakDays.length > 0
        ? peakDays.map((d) => `${d.dayLabel} (${d.dateLabel})`).join(", ")
        : "-";

    return {
      total,
      bySatisfaction,
      positiveRate,
      index,
      withFeedback,
      todayCount,
      trend,
      trendTotal,
      trendAverage,
      peakCount,
      peakLabel,
    };
  }, [surveys]);

  const quickInsight = useMemo(() => {
    if (stats.total === 0) {
      return {
        headline: "Belum ada data survey.",
        detail:
          "Arahkan pelanggan untuk mengisi survey agar insight layanan dapat terbentuk.",
      };
    }

    const dominant = SAT_ORDER.reduce(
      (best, k) =>
        stats.bySatisfaction[k] > stats.bySatisfaction[best] ? k : best,
      SAT_ORDER[0],
    );
    const dominantCount = stats.bySatisfaction[dominant];
    const dominantPct = Math.round((dominantCount / stats.total) * 100);

    const negativeCount =
      stats.bySatisfaction["Kurang Puas"] + stats.bySatisfaction["Tidak Puas"];
    const negativePct = Math.round((negativeCount / stats.total) * 100);

    const first3 = stats.trend
      .slice(0, 3)
      .reduce((sum, item) => sum + item.count, 0);
    const last3 = stats.trend
      .slice(-3)
      .reduce((sum, item) => sum + item.count, 0);
    const trendDelta = last3 - first3;

    const feedbackRate = Math.round((stats.withFeedback / stats.total) * 100);

    const dominantText = `Respon didominasi ${dominant} (${dominantPct}%).`;
    const qualityText =
      negativeCount === 0
        ? "Belum ada respon negatif dalam periode ini."
        : `Respon negatif tercatat ${negativePct}%.`;
    const trendText =
      trendDelta > 0
        ? `Volume respon 3 hari terakhir naik (+${trendDelta}) dibanding 3 hari sebelumnya.`
        : trendDelta < 0
          ? `Volume respon 3 hari terakhir turun (${trendDelta}) dibanding 3 hari sebelumnya.`
          : "Volume respon 3 hari terakhir stabil dibanding 3 hari sebelumnya.";

    return {
      headline: dominantText,
      detail: `${qualityText} ${trendText} Feedback tertulis masuk ${feedbackRate}%.`,
    };
  }, [stats]);

  const tableRows = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    const rows = surveys.filter((row) => {
      const satOk =
        tableFilterSat === "all" || row.satisfaction === tableFilterSat;
      const text =
        `${row.phoneNumber || ""} ${row.feedback || ""} ${row.satisfaction || ""}`.toLowerCase();
      const qOk = !q || text.includes(q);
      return satOk && qOk;
    });

    const toDateValue = (s: SurveyItem) => {
      const raw = s.createdAt || s.inputDate || "";
      const t = new Date(raw).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    return [...rows].sort((a, b) => {
      switch (tableSort) {
        case "date_asc":
          return toDateValue(a) - toDateValue(b);
        case "phone_asc":
          return (a.phoneNumber || "").localeCompare(b.phoneNumber || "");
        case "phone_desc":
          return (b.phoneNumber || "").localeCompare(a.phoneNumber || "");
        case "sat_desc":
          return SAT_SCORE[b.satisfaction] - SAT_SCORE[a.satisfaction];
        case "sat_asc":
          return SAT_SCORE[a.satisfaction] - SAT_SCORE[b.satisfaction];
        case "date_desc":
        default:
          return toDateValue(b) - toDateValue(a);
      }
    });
  }, [surveys, tableFilterSat, tableQuery, tableSort]);

  const donutRadius = 70;
  const donutStroke = 20;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = useMemo(() => {
    let acc = 0;
    return SAT_ORDER.map((k) => {
      const count = stats.bySatisfaction[k];
      const fraction = stats.total > 0 ? count / stats.total : 0;
      const length = fraction * donutCircumference;
      const segment = {
        key: k,
        count,
        fraction,
        dasharray: `${length} ${donutCircumference - length}`,
        dashoffset: -acc,
      };
      acc += length;
      return segment;
    });
  }, [stats.bySatisfaction, stats.total, donutCircumference]);

  const maxTrendCount = Math.max(1, ...stats.trend.map((t) => t.count));
  const trendAxisMid = Math.ceil(maxTrendCount / 2);
  const mobilePageSize = 6;
  const mobilePageCount = Math.max(
    1,
    Math.ceil(tableRows.length / mobilePageSize),
  );
  const mobileCardRows = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return tableRows.slice(start, start + mobilePageSize);
  }, [mobilePage, tableRows]);
  const mobileTrendChart = useMemo(() => {
    if (stats.trend.length === 0) return null;

    const width = 320;
    const height = 96;
    const paddingX = 10;
    const paddingTop = 10;
    const baselineY = height - 12;
    const usableHeight = baselineY - paddingTop;
    const step =
      stats.trend.length > 1
        ? (width - paddingX * 2) / (stats.trend.length - 1)
        : 0;

    const points = stats.trend.map((point, index) => {
      const x = stats.trend.length === 1 ? width / 2 : paddingX + step * index;
      const ratio = point.count / maxTrendCount;
      const y = baselineY - ratio * usableHeight;
      return {
        ...point,
        x,
        y,
      };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
    const lineSegments = points.slice(1).map((point, index) => ({
      key: `${points[index].key}-${point.key}`,
      x1: points[index].x,
      y1: points[index].y,
      x2: point.x,
      y2: point.y,
      delay: index * 110,
    }));

    return {
      baselineY,
      points,
      linePath,
      areaPath,
      lineSegments,
    };
  }, [maxTrendCount, stats.trend]);

  useEffect(() => {
    setMobilePage((page) => Math.min(page, mobilePageCount));
  }, [mobilePageCount]);

  useEffect(() => {
    setIsTrendChartVisible(false);
    const frame = requestAnimationFrame(() => {
      setIsTrendChartVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [mobileMotionTick, stats.trend]);

  useEffect(() => {
    const previousPage = previousMobilePageRef.current;
    if (mobilePage > previousPage) {
      setMobileSlideDirection("left");
    } else if (mobilePage < previousPage) {
      setMobileSlideDirection("right");
    }

    previousMobilePageRef.current = mobilePage;
  }, [mobilePage]);

  useEffect(() => {
    if (!hasInitializedMobileListRef.current) {
      hasInitializedMobileListRef.current = true;
      setMobileRenderedRows(mobileCardRows);
      setMobileListPhase("entering");
      const frame = requestAnimationFrame(() => {
        setIsMobileListVisible(true);
      });
      const settleTimer = window.setTimeout(() => {
        setMobileListPhase("idle");
      }, MOBILE_LIST_ENTER_MS);

      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(settleTimer);
      };
    }

    setMobileListPhase("exiting");
    setIsMobileListVisible(false);

    const swapTimer = window.setTimeout(() => {
      setMobileRenderedRows(mobileCardRows);
      setMobileListPhase("entering");
      requestAnimationFrame(() => {
        setIsMobileListVisible(true);
      });
    }, MOBILE_LIST_EXIT_MS);

    const settleTimer = window.setTimeout(() => {
      setMobileListPhase("idle");
      setMobileSlideDirection(null);
    }, MOBILE_LIST_EXIT_MS + MOBILE_LIST_ENTER_MS);

    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [mobileCardRows]);

  useEffect(() => {
    if (mobilePageCount <= 1) return;

    setIsActiveDotFlashing(true);
    const timeout = window.setTimeout(() => {
      setIsActiveDotFlashing(false);
    }, MOBILE_DOT_FLASH_MS);

    return () => window.clearTimeout(timeout);
  }, [mobilePage, mobilePageCount]);

  useEffect(() => {
    return () => {
      if (edgePulseTimeoutRef.current !== null) {
        window.clearTimeout(edgePulseTimeoutRef.current);
      }
    };
  }, []);

  const triggerEdgePulse = (side: "left" | "right") => {
    setEdgePulseSide(side);
    if (edgePulseTimeoutRef.current !== null) {
      window.clearTimeout(edgePulseTimeoutRef.current);
    }
    edgePulseTimeoutRef.current = window.setTimeout(() => {
      setEdgePulseSide(null);
    }, MOBILE_EDGE_PULSE_MS);
  };

  const resetSwipeState = () => {
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
    swipeAxisLockRef.current = null;
    setMobileDragOffset(0);
    setShowLeftEdgeHint(false);
    setShowRightEdgeHint(false);
  };

  const handleMobileCardsTouchStart = (clientX: number, clientY: number) => {
    swipeStartXRef.current = clientX;
    swipeStartYRef.current = clientY;
    swipeAxisLockRef.current = null;
    setMobileDragOffset(0);
  };

  const handleMobileCardsTouchMove = (clientX: number, clientY: number) => {
    if (swipeStartXRef.current === null || swipeStartYRef.current === null) {
      return;
    }

    const deltaY = clientY - swipeStartYRef.current;
    const deltaX = clientX - swipeStartXRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (swipeAxisLockRef.current === null) {
      const activationThreshold = 10;
      if (absX < activationThreshold && absY < activationThreshold) return;

      swipeAxisLockRef.current = absX > absY * 1.15 ? "x" : "y";
    }

    if (swipeAxisLockRef.current !== "x") {
      setMobileDragOffset(0);
      return;
    }

    const isPullingPastFirstPage = mobilePage === 1 && deltaX > 0;
    const isPullingPastLastPage = mobilePage === mobilePageCount && deltaX < 0;

    if (isPullingPastFirstPage && !showLeftEdgeHint) {
      triggerEdgePulse("left");
    }
    if (isPullingPastLastPage && !showRightEdgeHint) {
      triggerEdgePulse("right");
    }

    setShowLeftEdgeHint(isPullingPastFirstPage);
    setShowRightEdgeHint(isPullingPastLastPage);

    if (isPullingPastFirstPage || isPullingPastLastPage) {
      const rubberBandOffset =
        Math.sign(deltaX) * Math.min(28, Math.sqrt(Math.abs(deltaX)) * 3.2);
      setMobileDragOffset(rubberBandOffset);
      return;
    }

    const clampedOffset = Math.max(-48, Math.min(48, deltaX * 0.78));
    setMobileDragOffset(clampedOffset);
  };

  const handleMobileCardsTouchEnd = (clientX: number) => {
    if (
      swipeStartXRef.current === null ||
      swipeAxisLockRef.current !== "x" ||
      mobilePageCount <= 1
    ) {
      resetSwipeState();
      return;
    }

    const deltaX = clientX - swipeStartXRef.current;
    const swipeThreshold = 48;

    if (deltaX <= -swipeThreshold) {
      setMobilePage((page) => Math.min(mobilePageCount, page + 1));
    } else if (deltaX >= swipeThreshold) {
      setMobilePage((page) => Math.max(1, page - 1));
    }

    resetSwipeState();
  };

  const handleMobileCardsTouchCancel = () => {
    resetSwipeState();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] flex flex-col font-['Inter']">
      {isSidebarOpen && (
        <button
          className="sm:hidden fixed inset-0 z-[55] bg-black/30"
          aria-label="Tutup menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <nav
        className={`fixed left-0 top-0 h-full w-[280px] bg-white/95 backdrop-blur-sm border-r border-slate-200 flex flex-col py-6 gap-4 z-[60] transition-transform duration-200 sm:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sm:hidden px-4 mb-1 flex justify-end">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-600 hover:bg-slate-200"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 mb-2 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="PLN Logo"
            className="h-10 w-10 object-contain"
          />
          <span className="text-sm font-bold text-[#002e5b] leading-tight">
            Sistem Antrean Digital
            <br />
            <span className="text-xs font-medium text-slate-500">
              {officeName}
            </span>
          </span>
        </div>

        <div className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="mx-4 mb-1 mt-2 text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/admin/queue" &&
                    location.pathname === "/admin/queue/");
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`mx-2 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-['Inter'] font-medium text-sm">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-4 mt-auto border-t border-slate-200 pt-4 pb-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              onClick={() => setIsSidebarOpen(false)}
              className="flex-1 px-2 py-2 flex items-center gap-3 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials(user?.fullName || user?.username)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#005BAC] truncate">
                  {user?.fullName || user?.username || "Admin"}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : ""}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 transition-colors flex items-center justify-center"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full sm:w-[calc(100%-280px)] sm:ml-[280px] px-3 sm:px-safe-margin flex-1 flex flex-col pt-4 sm:pt-7 gap-4 pb-6 sm:pb-8">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-start sm:items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="sm:hidden p-2 rounded-full hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-[#191c21] tracking-tight leading-tight">
                Dashboard Survey
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1 leading-relaxed">
                Rekap kepuasan pelanggan secara real-time.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="text-[11px] sm:text-sm text-slate-500 sm:text-right leading-relaxed">
              Update terakhir: {lastUpdated.toLocaleTimeString("id-ID")}
              {isLoading ? " (memuat...)" : ""}
            </div>
            <button
              type="button"
              onClick={() => void fetchSurveys(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-container disabled:opacity-60 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              <RefreshCw
                size={15}
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Total Respon
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-extrabold text-primary leading-tight">
              {stats.total}
            </p>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Index Kepuasan
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-extrabold text-primary leading-tight">
              {stats.index}%
            </p>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Positive Rate
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-extrabold text-emerald-600 leading-tight">
              {stats.positiveRate}%
            </p>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Respon Hari Ini
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-extrabold text-cyan-700 leading-tight">
              {stats.todayCount}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col h-full min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Distribusi Kepuasan
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center min-h-[220px] sm:min-h-[300px]">
              <div className="flex items-center justify-center">
                <div className="relative w-[160px] h-[160px] sm:w-[220px] sm:h-[220px]">
                  <svg
                    viewBox="0 0 160 160"
                    className="w-full h-full -rotate-90"
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth={donutStroke}
                    />
                    {donutSegments.map((seg) => {
                      if (seg.count <= 0 || seg.fraction <= 0) return null;
                      return (
                        <circle
                          key={seg.key}
                          cx="80"
                          cy="80"
                          r={donutRadius}
                          fill="none"
                          strokeWidth={donutStroke}
                          strokeLinecap="butt"
                          strokeDasharray={seg.dasharray}
                          strokeDashoffset={seg.dashoffset}
                          className={
                            seg.key === "Sangat Puas"
                              ? "stroke-emerald-500"
                              : seg.key === "Puas"
                                ? "stroke-cyan-500"
                                : seg.key === "Kurang Puas"
                                  ? "stroke-amber-500"
                                  : "stroke-rose-500"
                          }
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                      Total
                    </p>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                      {stats.total}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 mt-1">
                      {stats.positiveRate}% Positif
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {SAT_ORDER.map((k) => {
                  const count = stats.bySatisfaction[k];
                  const pct =
                    stats.total > 0
                      ? Math.round((count / stats.total) * 100)
                      : 0;
                  return (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${SAT_COLOR[k]}`}
                        />
                        <span
                          className={`text-xs font-semibold truncate ${SAT_LABEL_COLOR[k]}`}
                        >
                          {k}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 shrink-0">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
              <p className="flex items-center gap-2 font-semibold text-slate-700">
                <SmilePlus size={16} className="text-primary" />
                Insight Cepat
              </p>
              <p className="mt-1 font-semibold text-slate-700">
                {quickInsight.headline}
              </p>
              <p className="mt-1">{quickInsight.detail}</p>
              <p className="mt-1 text-xs text-slate-500">
                Dasar insight: distribusi kepuasan, tren 7 hari, dan proporsi
                feedback.
              </p>
            </div>
          </div>

          <div className="xl:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Trend 7 Hari Terakhir
              </h2>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Total 7 Hari
                </p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {stats.trendTotal}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Rata-Rata / Hari
                </p>
                <p className="text-lg font-extrabold text-cyan-700 mt-0.5">
                  {stats.trendAverage}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Puncak Respon
                </p>
                <p
                  className="text-sm font-bold text-primary mt-0.5 break-words leading-snug"
                  title={stats.peakLabel}
                >
                  {stats.peakCount > 0
                    ? `${stats.peakCount} • ${stats.peakLabel}`
                    : "Belum ada puncak"}
                </p>
              </div>
            </div>

            {stats.trend.length === 0 ? (
              <div className="h-[220px] rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
                Belum ada data survey.
              </div>
            ) : (
              <>
                <div
                  className={`sm:hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all duration-500 ease-out ${
                    isTrendChartVisible
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                >
                  <div className="rounded-2xl bg-white/80 border border-white px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-2">
                      <span>0</span>
                      <span>Puncak {maxTrendCount}</span>
                    </div>
                    {mobileTrendChart ? (
                      <svg
                        viewBox="0 0 320 96"
                        className="block h-24 w-full overflow-visible"
                        aria-label="Sparkline tren survey 7 hari terakhir"
                        role="img"
                      >
                        <defs>
                          <linearGradient
                            id="surveyTrendArea"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="rgb(14 165 233)"
                              stopOpacity="0.28"
                            />
                            <stop
                              offset="100%"
                              stopColor="rgb(14 165 233)"
                              stopOpacity="0.02"
                            />
                          </linearGradient>
                        </defs>
                        <line
                          x1="10"
                          y1={mobileTrendChart.baselineY}
                          x2="310"
                          y2={mobileTrendChart.baselineY}
                          stroke="rgb(226 232 240)"
                          strokeDasharray="4 4"
                        />
                        <path
                          d={mobileTrendChart.areaPath}
                          fill="url(#surveyTrendArea)"
                          className={`transition-all duration-700 ease-out ${
                            isTrendChartVisible
                              ? "opacity-100"
                              : "translate-y-2 opacity-0"
                          }`}
                        />
                        {mobileTrendChart.lineSegments.map((segment) => (
                          <line
                            key={segment.key}
                            x1={segment.x1}
                            y1={segment.y1}
                            x2={segment.x2}
                            y2={segment.y2}
                            stroke="rgb(8 145 178)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="origin-left"
                            style={{
                              opacity: isTrendChartVisible ? 1 : 0,
                              transform: isTrendChartVisible
                                ? "scaleX(1)"
                                : "scaleX(0.15)",
                              transition: `opacity ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}, transform ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}`,
                              transitionDelay: `${segment.delay}ms`,
                            }}
                          />
                        ))}
                        {mobileTrendChart.points.map((point, index) => (
                          <g
                            key={point.key}
                            style={{
                              opacity: isTrendChartVisible ? 1 : 0,
                              transform: isTrendChartVisible
                                ? "translateY(0px) scale(1)"
                                : "translateY(4px) scale(0.85)",
                              transformOrigin: `${point.x}px ${point.y}px`,
                              transition: `opacity ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}, transform ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}`,
                              transitionDelay: `${index * 90 + 60}ms`,
                            }}
                          >
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="4.5"
                              fill="white"
                              stroke="rgb(8 145 178)"
                              strokeWidth="2.5"
                            />
                            <text
                              x={point.x}
                              y={Math.max(12, point.y - 10)}
                              textAnchor="middle"
                              className="fill-slate-500 text-[10px] font-semibold"
                            >
                              {point.count}
                            </text>
                          </g>
                        ))}
                      </svg>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1.5">
                    {stats.trend.map((point) => (
                      <div
                        key={point.key}
                        className="rounded-xl border border-slate-200 bg-white px-1.5 py-2 text-center"
                        title={`${point.dayLabel}, ${point.dateLabel}: ${point.count} respon`}
                      >
                        <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 truncate">
                          {point.dayLabel}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-800">
                          {point.count}
                        </div>
                        <div className="mt-0.5 text-[9px] text-slate-400 truncate">
                          {point.dateLabel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`hidden sm:flex h-[260px] rounded-2xl border border-slate-200 bg-slate-50 p-4 gap-3 transition-all duration-500 ease-out ${
                    isTrendChartVisible
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                >
                  <div className="w-8 h-full flex flex-col justify-between text-[10px] text-slate-400 font-semibold pt-1 pb-9">
                    <span>{maxTrendCount}</span>
                    <span>{trendAxisMid}</span>
                    <span>0</span>
                  </div>

                  <div className="relative flex-1 h-full border-l border-b border-slate-200 px-2 pb-9 pt-1 min-w-0">
                    <div className="absolute left-0 right-0 top-[10%] border-t border-dashed border-slate-200" />
                    <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-slate-200" />

                    <div className="h-full w-full flex items-end justify-between gap-2">
                      {stats.trend.map((point, index) => {
                        const h = Math.max(
                          8,
                          Math.round((point.count / maxTrendCount) * 100),
                        );
                        return (
                          <div
                            key={point.key}
                            className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1.5 group transition-all duration-500 ease-out"
                            title={`${point.dayLabel}, ${point.dateLabel}: ${point.count} respon`}
                            style={{
                              opacity: isTrendChartVisible ? 1 : 0,
                              transform: isTrendChartVisible
                                ? "translateY(0px)"
                                : "translateY(10px)",
                              transitionDelay: `${index * 90}ms`,
                            }}
                          >
                            <div
                              className="text-[10px] text-slate-500 font-semibold transition-all duration-500 ease-out"
                              style={{
                                opacity: isTrendChartVisible ? 1 : 0,
                                transform: isTrendChartVisible
                                  ? "translateY(0px)"
                                  : "translateY(4px)",
                                transitionDelay: `${index * 90 + 70}ms`,
                              }}
                            >
                              {point.count}
                            </div>
                            <div
                              className="w-full rounded-t-md bg-gradient-to-t from-primary to-cyan-400/90 transition-all duration-300 group-hover:brightness-110"
                              style={{
                                height: `${h}%`,
                                opacity: isTrendChartVisible ? 1 : 0.35,
                                transform: isTrendChartVisible
                                  ? "scaleY(1)"
                                  : "scaleY(0.2)",
                                transformOrigin: "bottom",
                                transitionDuration: "520ms",
                                transitionDelay: `${index * 90}ms`,
                              }}
                            />
                            <div
                              className="w-full text-center leading-tight transition-all duration-500 ease-out"
                              style={{
                                opacity: isTrendChartVisible ? 1 : 0,
                                transform: isTrendChartVisible
                                  ? "translateY(0px)"
                                  : "translateY(6px)",
                                transitionDelay: `${index * 90 + 110}ms`,
                              }}
                            >
                              <div className="text-[10px] font-semibold text-slate-600 truncate">
                                {point.dayLabel}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {point.dateLabel}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Feedback Terkirim
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">
                  {stats.withFeedback}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Tanpa Feedback
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">
                  {Math.max(0, stats.total - stats.withFeedback)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Respon Terbaru
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="relative md:col-span-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  placeholder="Cari No. HP / isi kritik"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </label>

              <label className="relative md:col-span-1">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={tableFilterSat}
                  onChange={(e) =>
                    setTableFilterSat(
                      e.target.value as "all" | SatisfactionOption,
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="all">Semua Kepuasan</option>
                  {SAT_ORDER.map((sat) => (
                    <option key={sat} value={sat}>
                      {sat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative md:col-span-1">
                <ArrowUpDown
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={tableSort}
                  onChange={(e) =>
                    setTableSort(
                      e.target.value as
                        | "date_desc"
                        | "date_asc"
                        | "phone_asc"
                        | "phone_desc"
                        | "sat_desc"
                        | "sat_asc",
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="date_desc">Tanggal Terbaru</option>
                  <option value="date_asc">Tanggal Terlama</option>
                  <option value="phone_asc">No. HP A-Z</option>
                  <option value="phone_desc">No. HP Z-A</option>
                  <option value="sat_desc">Kepuasan Tertinggi</option>
                  <option value="sat_asc">Kepuasan Terendah</option>
                </select>
              </label>
            </div>
          </div>

          {tableRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 text-center">
              Data tidak ditemukan. Coba ubah filter atau kata kunci pencarian.
            </div>
          ) : (
            <>
              <div className="md:hidden mb-3 flex items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/80 px-3 py-2 text-[11px] text-cyan-800">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <ChevronLeft size={14} className="text-cyan-600" />
                  <span>Geser untuk pindah halaman</span>
                  <ChevronRight size={14} className="text-cyan-600" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-cyan-700">
                  <span className="block h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  <span>Swipe kiri/kanan</span>
                </span>
              </div>
              <div className="grid gap-3 md:hidden">
                <div className="relative overflow-hidden rounded-[26px]">
                  <div
                    className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 rounded-l-[26px] bg-gradient-to-r from-cyan-200/55 via-cyan-100/30 to-transparent transition-all duration-200 ${
                      showLeftEdgeHint ||
                      (mobilePage === 1 && mobileDragOffset > 6)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                    style={{
                      transform:
                        edgePulseSide === "left" ? "scaleX(1.14)" : "scaleX(1)",
                      transitionDuration: `${MOBILE_EDGE_PULSE_MS}ms`,
                      transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
                    }}
                  >
                    <div className="flex h-full items-center justify-center">
                      <ChevronLeft
                        size={14}
                        className={`text-cyan-700/80 transition-all ${
                          edgePulseSide === "left"
                            ? "scale-110 opacity-100"
                            : ""
                        }`}
                        style={{
                          transitionDuration: `${MOBILE_EDGE_PULSE_MS}ms`,
                          transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 rounded-r-[26px] bg-gradient-to-l from-cyan-200/55 via-cyan-100/30 to-transparent transition-all duration-200 ${
                      showRightEdgeHint ||
                      (mobilePage === mobilePageCount && mobileDragOffset < -6)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                    style={{
                      transform:
                        edgePulseSide === "right"
                          ? "scaleX(1.14)"
                          : "scaleX(1)",
                      transitionDuration: `${MOBILE_EDGE_PULSE_MS}ms`,
                      transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
                    }}
                  >
                    <div className="flex h-full items-center justify-center">
                      <ChevronRight
                        size={14}
                        className={`text-cyan-700/80 transition-all ${
                          edgePulseSide === "right"
                            ? "scale-110 opacity-100"
                            : ""
                        }`}
                        style={{
                          transitionDuration: `${MOBILE_EDGE_PULSE_MS}ms`,
                          transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="grid gap-3"
                    onTouchStart={(event) =>
                      handleMobileCardsTouchStart(
                        event.changedTouches[0].clientX,
                        event.changedTouches[0].clientY,
                      )
                    }
                    onTouchMove={(event) =>
                      handleMobileCardsTouchMove(
                        event.changedTouches[0].clientX,
                        event.changedTouches[0].clientY,
                      )
                    }
                    onTouchEnd={(event) =>
                      handleMobileCardsTouchEnd(event.changedTouches[0].clientX)
                    }
                    onTouchCancel={handleMobileCardsTouchCancel}
                    style={{
                      touchAction: "pan-y",
                      transform: `translateX(${mobileDragOffset}px)`,
                      opacity:
                        1 - Math.min(0.18, Math.abs(mobileDragOffset) / 240),
                      transitionDuration:
                        swipeStartXRef.current === null
                          ? `${MOBILE_LIST_EXIT_MS}ms`
                          : "0ms",
                      transitionTimingFunction:
                        swipeStartXRef.current === null
                          ? MOBILE_LIST_EXIT_EASING
                          : "linear",
                    }}
                  >
                    {mobileRenderedRows.map((item, idx) => {
                      const isExiting = mobileListPhase === "exiting";
                      const isVisible = isMobileListVisible;
                      const txEnter =
                        mobileSlideDirection === "left"
                          ? 20
                          : mobileSlideDirection === "right"
                            ? -20
                            : 0;
                      const txExit =
                        mobileSlideDirection === "left"
                          ? -16
                          : mobileSlideDirection === "right"
                            ? 16
                            : 0;
                      // parallax: each successive card starts fractionally smaller, creating depth on enter
                      const scaleEnter = 0.97 - idx * 0.006;
                      const itemTransform = isExiting
                        ? `translateX(${txExit}px) translateY(4px) scale(0.98)`
                        : isVisible
                          ? "translateX(0px) translateY(0px) scale(1)"
                          : `translateX(${txEnter}px) translateY(8px) scale(${scaleEnter.toFixed(3)})`;
                      const itemOpacity = isExiting
                        ? "opacity-0"
                        : isVisible
                          ? "opacity-100"
                          : "opacity-0";

                      return (
                        <article
                          key={`${mobilePage}-${item.phoneNumber}-${idx}`}
                          className={`rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm ${itemOpacity}`}
                          style={{
                            transform: itemTransform,
                            transition: `transform ${isExiting ? MOBILE_LIST_EXIT_MS : MOBILE_LIST_ENTER_MS}ms ${isExiting ? MOBILE_LIST_EXIT_EASING : MOBILE_LIST_ENTER_EASING}, opacity ${isExiting ? MOBILE_LIST_EXIT_MS : MOBILE_LIST_ENTER_MS}ms ${isExiting ? MOBILE_LIST_EXIT_EASING : MOBILE_LIST_ENTER_EASING}`,
                            transitionDelay: `${idx * 45}ms`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                                Tanggal
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 leading-snug">
                                <CalendarDays
                                  size={13}
                                  className="text-slate-400 shrink-0"
                                />
                                <span>{fmtDate(item.inputDate)}</span>
                              </p>
                            </div>
                            <span
                              className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 ${SAT_LABEL_COLOR[item.satisfaction]}`}
                            >
                              {item.satisfaction}
                            </span>
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                              No. HP
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800 break-all">
                              {item.phoneNumber || "-"}
                            </p>
                          </div>

                          <div className="mt-3">
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                              Saran/Kritik
                            </p>
                            <p className="mt-1.5 text-sm text-slate-700 leading-relaxed break-words">
                              {item.feedback || "Tidak ada saran/kritik."}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                {tableRows.length > mobilePageSize ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>
                        Menampilkan {(mobilePage - 1) * mobilePageSize + 1}-
                        {Math.min(
                          mobilePage * mobilePageSize,
                          tableRows.length,
                        )}{" "}
                        dari {tableRows.length}
                      </span>
                      <span>
                        Halaman {mobilePage}/{mobilePageCount}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {Array.from({ length: mobilePageCount }, (_, index) => {
                        const pageNumber = index + 1;
                        const isActive = pageNumber === mobilePage;
                        return (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => setMobilePage(pageNumber)}
                            aria-label={`Ke halaman ${pageNumber}`}
                            aria-current={isActive ? "page" : undefined}
                            className={`h-2.5 rounded-full transition-all ${
                              isActive
                                ? `w-6 bg-primary ${
                                    isActiveDotFlashing
                                      ? "scale-125 shadow-[0_0_0_4px_rgba(14,165,233,0.18)]"
                                      : "scale-100"
                                  }`
                                : "w-2.5 bg-slate-300 hover:bg-slate-400"
                            }`}
                            style={{
                              transitionDuration: `${MOBILE_DOT_FLASH_MS}ms`,
                              transitionTimingFunction:
                                MOBILE_LIST_ENTER_EASING,
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMobilePage((page) => Math.max(1, page - 1))
                        }
                        disabled={mobilePage === 1}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMobilePage((page) =>
                            Math.min(mobilePageCount, page + 1),
                          )
                        }
                        disabled={mobilePage === mobilePageCount}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full md:table-fixed text-sm bg-white">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
                      <th className="py-2.5 px-3 font-semibold md:w-[140px]">
                        Tanggal
                      </th>
                      <th className="py-2.5 px-3 font-semibold md:w-[140px]">
                        No. HP
                      </th>
                      <th className="py-2.5 px-3 font-semibold md:w-[150px]">
                        Kepuasan
                      </th>
                      <th className="py-2.5 px-3 font-semibold md:w-[55%]">
                        Saran/Kritik
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((item, idx) => (
                      <tr
                        key={`${item.phoneNumber}-${idx}`}
                        className="border-b border-slate-100 align-top hover:bg-slate-50"
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <CalendarDays
                              size={13}
                              className="text-slate-400"
                            />
                            {fmtDate(item.inputDate)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {item.phoneNumber || "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 ${SAT_LABEL_COLOR[item.satisfaction]}`}
                          >
                            {item.satisfaction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 break-words">
                          {item.feedback || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
