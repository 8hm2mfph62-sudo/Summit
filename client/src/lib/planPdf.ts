import { APP_NAME } from "./brand";

export type PlanPdfPlan = {
  id: string;
  mode: "friends" | "ai";
  status: "draft" | "ready" | "planned" | "archived";
  title: string;
  mountainName: string | null;
  planDate: string | null;
  meetingTime: string | null;
  meetingPlace: string | null;
  routeSummary: string | null;
  transport: string | null;
  notes: string | null;
  equipmentChecklist: string[];
  safetyNote: string | null;
  updatedAt: string | null;
};

export type PlanPdfParticipant = {
  userId: number;
  role: "owner" | "member";
  membershipStatus: "invited" | "active" | "declined" | "removed";
  nickname: string;
};

export type PlanPdfInput = {
  plan: PlanPdfPlan;
  participants: PlanPdfParticipant[];
  missingFields: string[];
};

export type PlanPdfModel = {
  title: string;
  filename: string;
  modeLabel: string;
  statusLabel: string;
  statusTone: "green" | "amber" | "gray";
  destination: string;
  planDate: string;
  meeting: string;
  route: string;
  transport: string;
  notes: string;
  safetyNote: string;
  equipment: string[];
  participants: Array<{ label: string; status: string }>;
  missingFields: string[];
  exportedAt: string;
  updatedAt: string;
};

const FALLBACK = "未定";
const filenameUnsafeCharacters = /[\\/:*?"<>|\u0000-\u001f]/g;

function text(value: string | null | undefined, fallback = FALLBACK) {
  return value?.trim() || fallback;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function formatDateTime(value: string | null, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function modeLabel(mode: PlanPdfPlan["mode"]) {
  return mode === "ai" ? "ヤマコと作成" : "フレンド計画";
}

function planStatus(status: PlanPdfPlan["status"]) {
  const labels = {
    draft: { label: "作成中", tone: "amber" as const },
    ready: { label: "確認待ち", tone: "green" as const },
    planned: { label: "計画確定", tone: "green" as const },
    archived: { label: "保管済み", tone: "gray" as const },
  };
  return labels[status];
}

function participantStatus(status: PlanPdfParticipant["membershipStatus"]) {
  const labels = {
    active: "参加",
    invited: "招待中",
    declined: "辞退",
    removed: "退出",
  };
  return labels[status];
}

/** Produces a file-safe Japanese filename for the downloaded plan PDF. */
export function planPdfFilename(title: string, date = new Date()) {
  const safeTitle = (title.trim() || "登山計画書")
    .replace(filenameUnsafeCharacters, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  return `登山計画書_${safeTitle}_${stamp}.pdf`;
}

/** Normalizes persisted plan data for both PDF markup and unit tests. */
export function createPlanPdfModel(
  input: PlanPdfInput,
  generatedAt = new Date()
): PlanPdfModel {
  const status = planStatus(input.plan.status);
  const planDate = text(input.plan.planDate);
  const meetingTime = text(input.plan.meetingTime);
  const meetingPlace = text(input.plan.meetingPlace);

  return {
    title: text(input.plan.title, "登山計画書"),
    filename: planPdfFilename(input.plan.title, generatedAt),
    modeLabel: modeLabel(input.plan.mode),
    statusLabel: status.label,
    statusTone: status.tone,
    destination: text(input.plan.mountainName),
    planDate,
    meeting:
      meetingTime === FALLBACK && meetingPlace === FALLBACK
        ? FALLBACK
        : `${meetingTime}${meetingPlace === FALLBACK ? "" : ` ／ ${meetingPlace}`}`,
    route: text(input.plan.routeSummary, "未記入"),
    transport: text(input.plan.transport),
    notes: text(input.plan.notes, "特記事項はありません。"),
    safetyNote: text(
      input.plan.safetyNote,
      "天気・登山道・交通の公式情報を出発前に確認してください。"
    ),
    equipment: input.plan.equipmentChecklist.filter(Boolean),
    participants: input.participants.map(participant => ({
      label: `${participant.nickname}${participant.role === "owner" ? "（作成者）" : ""}`,
      status: participantStatus(participant.membershipStatus),
    })),
    missingFields: input.missingFields,
    exportedAt: formatDateTime(generatedAt.toISOString(), "出力日時不明"),
    updatedAt: formatDateTime(input.plan.updatedAt, "更新日時不明"),
  };
}

/**
 * Generates the printable DOM safely. All persisted user text is escaped before
 * insertion, so plan notes cannot inject markup into the export document.
 */
export function planPdfMarkup(model: PlanPdfModel) {
  const equipment = model.equipment.length
    ? model.equipment
        .map(item => `<li><span class="check">□</span>${escapeHtml(item)}</li>`)
        .join("")
    : '<li class="muted">装備はまだ登録されていません。</li>';
  const participants = model.participants.length
    ? model.participants
        .map(
          participant =>
            `<li><span>${escapeHtml(participant.label)}</span><b>${escapeHtml(participant.status)}</b></li>`
        )
        .join("")
    : '<li class="muted">参加メンバーは未登録です。</li>';
  const missing = model.missingFields.length
    ? `<section class="notice"><strong>出発前に確認</strong><span>${escapeHtml(model.missingFields.join("・"))}</span></section>`
    : '<section class="notice complete"><strong>計画書の主要項目を確認済み</strong><span>出発前に公式情報を再確認してください。</span></section>';

  const info = (label: string, value: string, wide = false) =>
    `<div class="info ${wide ? "wide" : ""}"><span>${label}</span><p>${escapeHtml(value).replace(/\n/g, "<br>")}</p></div>`;

  return `
    <div class="plan-pdf-page">
      <header>
        <div>
          <p class="eyebrow">PEAK ALBUM / HIKING PLAN BOOK</p>
          <h1>登山計画書</h1>
          <p class="title">${escapeHtml(model.title)}</p>
        </div>
        <div class="badges">
          <span class="badge">${escapeHtml(model.modeLabel)}</span>
          <span class="badge ${model.statusTone}">${escapeHtml(model.statusLabel)}</span>
        </div>
      </header>

      ${missing}

      <section class="section">
        <h2>山行の基本情報</h2>
        <div class="info-grid">
          ${info("行き先", model.destination)}
          ${info("登山日", model.planDate)}
          ${info("集合・出発", model.meeting)}
          ${info("交通手段", model.transport)}
          ${info("ルート・行程", model.route, true)}
        </div>
      </section>

      <section class="section two-col">
        <div>
          <h2>参加メンバー</h2>
          <ul class="people">${participants}</ul>
        </div>
        <div>
          <h2>必携装備</h2>
          <ul class="checklist">${equipment}</ul>
        </div>
      </section>

      <section class="section safety">
        <h2>安全メモ</h2>
        <p>${escapeHtml(model.safetyNote).replace(/\n/g, "<br>")}</p>
      </section>

      <section class="section notes">
        <h2>備考</h2>
        <p>${escapeHtml(model.notes).replace(/\n/g, "<br>")}</p>
      </section>

      <footer>
        <p>最終更新：${escapeHtml(model.updatedAt)}　｜　PDF出力：${escapeHtml(model.exportedAt)}</p>
        <p>天候・登山道・交通・入山規制は、必ず出発直前に公式情報で確認してください。緊急時は無理をせず、119番または現地の救助要請窓口へ連絡してください。</p>
      </footer>
    </div>`;
}

function pageCanvas(source: HTMLCanvasElement, y: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = Math.min(height, source.height - y);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF画像を準備できませんでした。");
  context.drawImage(
    source,
    0,
    y,
    source.width,
    canvas.height,
    0,
    0,
    source.width,
    canvas.height
  );
  return canvas;
}

/**
 * Captures a dedicated print layout in the browser and downloads an A4 PDF.
 * Canvas conversion preserves Japanese text on devices without embedded CJK
 * fonts in jsPDF itself.
 */
export async function exportPlanPdf(input: PlanPdfInput) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("PDF出力はブラウザから実行してください。");
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const model = createPlanPdfModel(input);
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = [
    "position:fixed",
    "left:-100000px",
    "top:0",
    "width:794px",
    "z-index:-1",
    "background:#fffdf6",
    "color:#173325",
    "font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif",
  ].join(";");
  root.innerHTML = `<style>
    .plan-pdf-page{box-sizing:border-box;width:794px;min-height:1123px;padding:44px;background:#fffdf6;color:#173325;font-size:14px;line-height:1.65}
    .plan-pdf-page *{box-sizing:border-box}.plan-pdf-page header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:3px solid #1f6a43;padding-bottom:20px}
    .plan-pdf-page .eyebrow{margin:0;color:#367854;font-weight:800;font-size:10px;letter-spacing:1.7px}.plan-pdf-page h1{margin:4px 0 0;font-size:26px;line-height:1.25}.plan-pdf-page .title{margin:5px 0 0;font-size:17px;font-weight:800}
    .plan-pdf-page .badges{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.plan-pdf-page .badge{border-radius:999px;background:#e4f1e7;color:#145431;font-weight:800;font-size:10px;padding:6px 10px;white-space:nowrap}.plan-pdf-page .badge.amber{background:#fff0c9;color:#855600}.plan-pdf-page .badge.gray{background:#eeeef0;color:#55535a}
    .plan-pdf-page .notice{display:flex;gap:12px;align-items:center;margin:18px 0;padding:12px 14px;border-radius:10px;background:#fff4d9;color:#765000;font-size:12px}.plan-pdf-page .notice.complete{background:#e9f5eb;color:#1a643b}.plan-pdf-page .notice strong{white-space:nowrap}
    .plan-pdf-page .section{margin-top:21px;break-inside:avoid}.plan-pdf-page h2{margin:0 0 9px;border-left:4px solid #2e7a4b;padding-left:9px;font-size:14px;line-height:1.25}.plan-pdf-page .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.plan-pdf-page .info{min-height:63px;border:1px solid #dbe8dd;border-radius:9px;background:#fff;padding:9px 11px}.plan-pdf-page .info.wide{grid-column:1/-1}.plan-pdf-page .info span{color:#5d7766;font-size:10px;font-weight:800}.plan-pdf-page .info p{margin:3px 0 0;font-size:13px;font-weight:700;white-space:normal;overflow-wrap:anywhere}
    .plan-pdf-page .two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px}.plan-pdf-page ul{list-style:none;margin:0;padding:0}.plan-pdf-page .people,.plan-pdf-page .checklist{border-radius:9px;background:#fff;padding:4px 12px}.plan-pdf-page .people li,.plan-pdf-page .checklist li{display:flex;gap:7px;align-items:baseline;border-bottom:1px solid #edf2ee;padding:7px 0}.plan-pdf-page .people li:last-child,.plan-pdf-page .checklist li:last-child{border-bottom:0}.plan-pdf-page .people b{margin-left:auto;color:#3d7954;font-size:10px}.plan-pdf-page .check{color:#2d7149;font-size:16px;font-weight:900}.plan-pdf-page .muted{color:#777;font-size:12px}
    .plan-pdf-page .safety{border:1px solid #edcfaa;border-radius:10px;background:#fff8ed;padding:13px 15px}.plan-pdf-page .safety h2{border-left-color:#b66d17}.plan-pdf-page .safety p,.plan-pdf-page .notes p{margin:0;white-space:normal;overflow-wrap:anywhere}.plan-pdf-page .notes{border:1px solid #dbe8dd;border-radius:10px;padding:13px 15px}.plan-pdf-page footer{margin-top:28px;border-top:1px solid #cfded1;padding-top:12px;color:#4f6756;font-size:9px;line-height:1.55}.plan-pdf-page footer p{margin:0 0 5px}
  </style>${planPdfMarkup(model)}`;

  document.body.appendChild(root);
  try {
    if ("fonts" in document) await document.fonts.ready;
    await new Promise<void>(resolve =>
      window.requestAnimationFrame(() => resolve())
    );
    const captured = await html2canvas(root, {
      backgroundColor: "#fffdf6",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    pdf.setProperties({
      title: `登山計画書 - ${model.title}`,
      subject: `${APP_NAME} 登山計画書`,
      author: APP_NAME,
      creator: APP_NAME,
    });

    const margin = 12;
    const pageWidth = 210;
    const pageHeight = 297;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const sourcePixelsPerMm = captured.width / printableWidth;
    const sourcePageHeight = Math.max(
      1,
      Math.floor(printableHeight * sourcePixelsPerMm)
    );

    for (
      let top = 0, page = 0;
      top < captured.height;
      top += sourcePageHeight, page += 1
    ) {
      if (page > 0) pdf.addPage();
      const slice = pageCanvas(captured, top, sourcePageHeight);
      const drawnHeight = slice.height / sourcePixelsPerMm;
      pdf.addImage(
        slice.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        printableWidth,
        drawnHeight,
        undefined,
        "FAST"
      );
    }
    pdf.save(model.filename);
    return {
      filename: model.filename,
      pageCount: Math.ceil(captured.height / sourcePageHeight),
    };
  } finally {
    root.remove();
  }
}
