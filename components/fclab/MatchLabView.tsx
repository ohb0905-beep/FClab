"use client";

import React, { useState } from "react";
import {
  Search,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Activity,
  Users,
  KeyRound,
  Info,
} from "lucide-react";
import {
  MatchAnalysisResponse,
  SquadSlot,
  getPositionToneClass,
} from "@/lib/fclab-types";
import { PlayerAvatar, SeasonBadge } from "./VisualCharts";

interface MatchLabViewProps {
  nexonKeyConfigured: boolean;
  nexonKeyPreview: string;
  onImportStartingXIToSquadLab: (slots: SquadSlot[]) => void;
  onInspectPlayerInLab: (spid: number) => void;
}

const MATCH_TYPES = [
  { code: 50, label: "공식경기 (1vs1)" },
  { code: 52, label: "감독모드" },
  { code: 40, label: "클래식 1on1" },
  { code: 60, label: "공식경기 친선" },
];

export default function MatchLabView({
  nexonKeyConfigured,
  nexonKeyPreview,
  onImportStartingXIToSquadLab,
  onInspectPlayerInLab,
}: MatchLabViewProps) {
  const [nickname, setNickname] = useState("");
  const [matchType, setMatchType] = useState<number>(50);
  const [limit, setLimit] = useState<number>(15);

  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    code?: string;
    requiresApiKey?: boolean;
  } | null>(null);
  const [result, setResult] = useState<MatchAnalysisResponse | null>(null);

  const handleAnalyzeMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorInfo({
        message: "조회할 FC 온라인 구단주 닉네임을 입력해 주세요.",
      });
      return;
    }

    setLoading(true);
    setErrorInfo(null);

    try {
      const params = new URLSearchParams({
        nickname: nickname.trim(),
        matchtype: String(matchType),
        limit: String(limit),
      });
      const res = await fetch(`/api/fclab/v1/match/analyze?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrorInfo({
          message:
            json.error ||
            "넥슨 Open API 전적 조회 중 오류가 발생했습니다.",
          code: json.code,
          requiresApiKey: Boolean(json.requires_api_key),
        });
        setResult(null);
      } else {
        setResult({
          user: json.user,
          analysis: json.analysis,
        });
      }
    } catch (err) {
      setErrorInfo({
        message:
          err instanceof Error
            ? err.message
            : "서버 측 매치 분석 라우트 호출에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportStartingXI = () => {
    if (!result?.analysis.latestStartingXI?.length) return;
    const mappedSlots: SquadSlot[] = result.analysis.latestStartingXI
      .slice(0, 11)
      .map((item, index) => ({
        slot_id: `${item.position}${index + 1}`,
        slot_position: item.position === "SUB" ? "CM" : item.position,
        spid: item.spid,
        grade: item.grade || 5,
      }));
    onImportStartingXIToSquadLab(mappedSlots);
  };

  return (
    <div className="space-y-6">
      {/* Server-Side API Connection Status & Search Bar */}
      <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                MATCH LAB · NEXON OPEN API TELEMETRY
              </span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  nexonKeyConfigured
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                {nexonKeyConfigured
                  ? `서버 API 키 연결됨 (${nexonKeyPreview})`
                  : "NEXON_OPEN_API_KEY 서버 환경변수 미설정"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">
              실시간 구단주 매치 기록 분석 및 경기력 개선 진단
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              넥슨 FC 온라인 Open API를 서버 측에서 안전하게 호출하여 최근 경기 승률, 슈팅 구역, 패스 성공률, 핵심 활약 선수를 분석하고 [관찰된 사실 → 가능한 원인 → 추천 행동] 3단계 처방을 제시합니다.
            </p>
          </div>

          <form
            onSubmit={handleAnalyzeMatches}
            className="flex flex-wrap items-center gap-2.5"
          >
            <div className="relative w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="구단주 닉네임 입력"
                className="w-full bg-[#0B0F17] border border-slate-700/80 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
              />
            </div>

            <select
              value={matchType}
              onChange={(e) => setMatchType(Number(e.target.value))}
              className="bg-[#0B0F17] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
            >
              {MATCH_TYPES.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-[#0B0F17] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none"
            >
              {[10, 15, 20].map((cnt) => (
                <option key={cnt} value={cnt}>
                  최근 {cnt}경기
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              실시간 전적 조회
            </button>
          </form>
        </div>

        {/* Transparent Notice When NEXON_OPEN_API_KEY Is Missing */}
        {!nexonKeyConfigured && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 bg-[#0B0F17]/90 rounded-lg p-4 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-amber-300 text-sm">
                  넥슨 Open API 키(NEXON_OPEN_API_KEY) 서버 비밀 설정 안내
                </div>
                <p className="text-slate-300 leading-relaxed">
                  프로젝트 원칙(가짜 전적 데이터 생성 금지 및 API 키 프런트엔드 비노출)에 따라, 구단주 개인 매치 기록 조회는 서버 측 환경변수{" "}
                  <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">
                    NEXON_OPEN_API_KEY
                  </code>
                  가 설정된 경우에만 실제 넥슨 Open API(
                  <code className="text-slate-400 font-mono">
                    https://open.api.nexon.com/fconline/v1/*
                  </code>
                  )를 호출합니다.
                </p>
                <p className="text-slate-400">
                  설정 방법: AI Studio 좌측/상단의 <strong>Secrets (환경변수)</strong> 패널에{" "}
                  <code className="text-slate-200 font-mono">NEXON_OPEN_API_KEY</code>{" "}
                  이름으로 넥슨 개발자 센터(developers.nexon.com)에서 발급받은 API 키를 등록하면 프런트엔드 노출 없이 즉시 실시간 매치 분석이 활성화됩니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error State Panel */}
      {errorInfo && (
        <div className="bg-[#131B2E] border border-rose-500/40 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-300">
                  실시간 매치 데이터 조회 실패
                </h3>
                {errorInfo.code && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300">
                    {errorInfo.code}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-200">{errorInfo.message}</p>
              {errorInfo.requiresApiKey && (
                <p className="text-xs text-slate-400 mt-1">
                  임의의 가상 전적을 생성하지 않고 실제 연결 상태를 그대로 표시합니다. 서버 환경변수에{" "}
                  <code className="font-mono text-emerald-300">
                    NEXON_OPEN_API_KEY
                  </code>
                  를 등록한 뒤 다시 시도해 주세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loaded Real Match Telemetry */}
      {result ? (
        <div className="space-y-6">
          {/* User Profile & KPI Strip */}
          <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-slate-100">
                    {result.user.nickname}
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Lv.{result.user.level}
                  </span>
                  {result.user.maxDivisions?.map((div) => (
                    <span
                      key={`${div.matchType}-${div.division}`}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    >
                      {div.matchTypeName}: {div.divisionName}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  최근 {result.analysis.metrics.totalMatches}경기 표본 · 분석 시각:{" "}
                  {new Date(result.analysis.analyzedAt).toLocaleString("ko-KR")}
                </p>
              </div>

              {result.analysis.latestStartingXI?.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportStartingXI}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Users className="w-4 h-4" />
                  최근 경기 선발 11명 스쿼드 빌더로 불러오기
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 6 Core Telemetry Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3">
                <div className="text-xs text-slate-400">전적 / 승률</div>
                <div className="text-lg font-mono font-bold tabular-nums text-emerald-400 mt-1">
                  {result.analysis.metrics.winRate}%
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {result.analysis.metrics.wins}승 {result.analysis.metrics.draws}무{" "}
                  {result.analysis.metrics.losses}패
                </div>
              </div>

              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3">
                <div className="text-xs text-slate-400">경기당 득점 / 실점</div>
                <div className="text-lg font-mono font-bold tabular-nums text-slate-100 mt-1">
                  {result.analysis.metrics.avgGoalsFor} /{" "}
                  <span className="text-rose-400">
                    {result.analysis.metrics.avgGoalsAgainst}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  득실차{" "}
                  {result.analysis.metrics.goalDiff >= 0
                    ? `+${result.analysis.metrics.goalDiff}`
                    : result.analysis.metrics.goalDiff}
                </div>
              </div>

              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3">
                <div className="text-xs text-slate-400">유효슈팅 전환율</div>
                <div className="text-lg font-mono font-bold tabular-nums text-sky-400 mt-1">
                  {result.analysis.metrics.shotAccuracy}%
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  중거리 비중 {result.analysis.metrics.outBoxShotRatio}%
                </div>
              </div>

              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3">
                <div className="text-xs text-slate-400">전체 패스 성공률</div>
                <div className="text-lg font-mono font-bold tabular-nums text-slate-100 mt-1">
                  {result.analysis.metrics.passAccuracy}%
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  스루패스 {result.analysis.metrics.throughPassAccuracy}%
                </div>
              </div>

              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3">
                <div className="text-xs text-slate-400">평균 점유율</div>
                <div className="text-lg font-mono font-bold tabular-nums text-amber-400 mt-1">
                  {result.analysis.metrics.avgPossession}%
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  태클 성공 {result.analysis.metrics.tackleAccuracy}%
                </div>
              </div>

              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3">
                <div className="text-xs text-slate-400">최근 흐름</div>
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {result.analysis.metrics.recentSequence.map((res, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded text-[11px] font-mono font-bold flex items-center justify-center ${
                        res === "승"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : res === "무"
                          ? "bg-slate-700 text-slate-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {res}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3-Step Diagnostics: 관찰된 사실 -> 가능한 원인 -> 추천 행동 */}
          <div className="bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                  3-STEP TACTICAL DIAGNOSTICS
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">
                  경기 데이터 기반 3단계 개선 코칭 (관찰된 사실 → 가능한 원인 → 추천 행동)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.analysis.diagnostics.map((diag, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-4 border bg-[#0B0F17] ${
                    diag.severity === "high"
                      ? "border-rose-500/40"
                      : diag.severity === "positive"
                      ? "border-emerald-500/40"
                      : "border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      {diag.severity === "positive" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            diag.severity === "high"
                              ? "text-rose-400"
                              : "text-amber-400"
                          }`}
                        />
                      )}
                      {diag.category}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        diag.severity === "high"
                          ? "bg-rose-500/15 text-rose-300"
                          : diag.severity === "positive"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {diag.severity === "high"
                        ? "우선 개선 권장"
                        : diag.severity === "positive"
                        ? "강점 유지"
                        : "전술 점검"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#131B2E]/90 rounded-lg p-2.5 border border-slate-800/80">
                      <span className="font-mono text-sky-400 font-semibold block mb-0.5">
                        1. 관찰된 사실 (Observed Fact)
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {diag.observed_fact}
                      </p>
                    </div>
                    <div className="bg-[#131B2E]/90 rounded-lg p-2.5 border border-slate-800/80">
                      <span className="font-mono text-amber-400 font-semibold block mb-0.5">
                        2. 가능한 원인 (Possible Cause)
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {diag.possible_cause}
                      </p>
                    </div>
                    <div className="bg-[#131B2E]/90 rounded-lg p-2.5 border border-slate-800/80">
                      <span className="font-mono text-emerald-400 font-semibold block mb-0.5">
                        3. 추천 행동 (Recommended Action)
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {diag.recommended_action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{result.analysis.methodologyNote}</span>
            </div>
          </div>

          {/* Key Performing Players & Match History Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Key Performers */}
            <div className="lg:col-span-5 bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
              <h3 className="text-base font-bold text-slate-100 mb-1">
                최근 매치 핵심 활약 선수 (평점/공격포인트)
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                선수 클릭 시 선수 연구소(Player Lab) 세부 스탯 화면으로 이동합니다.
              </p>

              <div className="space-y-2.5">
                {result.analysis.topPlayers.map((tp) => (
                  <button
                    key={tp.spid}
                    type="button"
                    onClick={() => onInspectPlayerInLab(tp.spid)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800/80 hover:border-emerald-500/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar
                        spid={tp.spid}
                        name={tp.name}
                        thumbUrl={tp.thumb_url}
                        size={36}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <SeasonBadge seasonCode={tp.season_code} />
                          <span className="text-xs font-semibold text-slate-100">
                            {tp.name}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400">
                            +{tp.grade}강
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          <span className={getPositionToneClass(tp.position)}>
                            {tp.position}
                          </span>{" "}
                          · {tp.appearances}경기 출전
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <div className="text-xs font-bold text-emerald-400">
                        평점 {tp.avgRating}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {tp.goals}골 · {tp.assists}도움
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Match Log Table */}
            <div className="lg:col-span-7 bg-[#131B2E] border border-slate-800/80 rounded-xl p-5">
              <h3 className="text-base font-bold text-slate-100 mb-1">
                최근 경기 상세 로그
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                넥슨 Open API `/fconline/v1/match-detail` 실제 응답 데이터
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                      <th className="py-2 px-2">결과</th>
                      <th className="py-2 px-2">스코어</th>
                      <th className="py-2 px-2">상대 구단주</th>
                      <th className="py-2 px-2 text-right">점유율</th>
                      <th className="py-2 px-2 text-right">슈팅(유효)</th>
                      <th className="py-2 px-2 text-right">패스성공</th>
                      <th className="py-2 px-2 text-right">일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-mono tabular-nums">
                    {result.analysis.matches.map((m) => (
                      <tr key={m.matchId} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              m.result === "승"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : m.result === "무"
                                ? "bg-slate-700 text-slate-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {m.result}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-slate-100">
                          {m.score}
                        </td>
                        <td className="py-2.5 px-2 font-sans text-slate-300">
                          {m.opponent}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-300">
                          {m.possession}%
                        </td>
                        <td className="py-2.5 px-2 text-right text-sky-400">
                          {m.shots} ({m.effectiveShots})
                        </td>
                        <td className="py-2.5 px-2 text-right text-emerald-400">
                          {m.passRate}%
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-500">
                          {m.matchDate?.slice(5, 16).replace("T", " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
