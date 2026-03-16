import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Line, Bar } from 'react-chartjs-2'
import { ArrowLeft, BookOpen, CheckCircle, Flame } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { usePatientAnalytics, useComparison } from '../../hooks/useAnalytics'
import { today, daysAgo } from '../../utils/dates'
import styles from './AnalyticsPage.module.scss'

const GRANULARITY_OPTIONS = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
]

function defaultDateRange() {
  return {
    date_from: daysAgo(60),
    date_to: today(),
  }
}

async function sha256Prefix(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 16)
}

export default function AnalyticsPage() {
  const { patientId } = useParams()
  const [range, setRange] = useState(defaultDateRange)
  const [granularity, setGranularity] = useState('day')

  const params = useMemo(
    () => ({
      date_from: range.date_from,
      date_to: range.date_to,
      granularity,
    }),
    [range.date_from, range.date_to, granularity]
  )
  const comparisonParams = useMemo(
    () => ({ date_from: range.date_from, date_to: range.date_to }),
    [range.date_from, range.date_to]
  )

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = usePatientAnalytics(
    Number(patientId),
    params,
    { enabled: !!patientId }
  )
  const { data: comparison, isLoading: comparisonLoading } = useComparison(comparisonParams)

  const [currentPatientHash, setCurrentPatientHash] = useState(null)
  useEffect(() => {
    if (!patientId) return
    sha256Prefix(String(patientId)).then(setCurrentPatientHash)
  }, [patientId])

  const comparisonWithLabels = useMemo(() => {
    if (!comparison?.patients?.length) return { patients: [], averages: comparison?.averages }
    return {
      patients: comparison.patients.map((p, i) => ({ ...p, label: `P${i + 1}` })),
      averages: comparison.averages,
    }
  }, [comparison])

  const highlightIndex = useMemo(() => {
    if (!currentPatientHash || !comparisonWithLabels.patients.length) return null
    const i = comparisonWithLabels.patients.findIndex((p) => p.patient_hash === currentPatientHash)
    return i >= 0 ? i : null
  }, [currentPatientHash, comparisonWithLabels.patients])

  // Task vs mood chart
  const taskVsMoodChart = useMemo(() => {
    const tvm = analytics?.task_vs_mood || []
    if (!tvm.length) return null
    return {
      labels: tvm.map((x) => x.period),
      datasets: [
        {
          label: 'Cumplimiento de tareas',
          data: tvm.map((x) => x.completion_rate),
          borderColor: '#5c7a6e',
          backgroundColor: 'rgba(92, 122, 110, 0.1)',
          fill: true,
          yAxisID: 'y',
          tension: 0.3,
        },
        {
          label: 'Sentimientos positivos',
          data: tvm.map((x) => x.positive_ratio),
          borderColor: '#6b9ac4',
          backgroundColor: 'rgba(107, 154, 196, 0.1)',
          fill: true,
          yAxisID: 'y1',
          tension: 0.3,
        },
      ],
    }
  }, [analytics?.task_vs_mood])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const idx = items[0]?.dataIndex
              const tvm = analytics?.task_vs_mood || []
              const row = tvm[idx]
              if (row) return [`Entradas diario: ${row.journal_count}`]
              return []
            },
          },
        },
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          min: 0,
          max: 100,
          title: { display: true, text: 'Cumplimiento %' },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 100,
          title: { display: true, text: 'Positivos %' },
          grid: { drawOnChartArea: false },
        },
      },
    }),
    [analytics?.task_vs_mood]
  )

  // Stacked bar: feeling_timeline
  const feelingTimelineChart = useMemo(() => {
    const ft = analytics?.feeling_timeline || []
    if (!ft.length) return null
    const labels = ft.map((x) => x.period)
    const feelingKeys = []
    const seen = new Set()
    ft.forEach((p) => {
      (p.feelings || []).forEach((f) => {
        const key = f.title
        if (!seen.has(key)) {
          seen.add(key)
          feelingKeys.push({ title: key, color: f.color || '#888', emoji: f.emoji })
        }
      })
    })
    const datasets = feelingKeys.map((fk, i) => ({
      label: fk.emoji ? `${fk.emoji} ${fk.title}` : fk.title,
      data: ft.map((p) => {
        const f = (p.feelings || []).find((x) => x.title === fk.title)
        return f ? f.count : 0
      }),
      backgroundColor: fk.color || `hsl(${(i * 60) % 360}, 50%, 60%)`,
    }))
    return { labels, datasets }
  }, [analytics?.feeling_timeline])

  const stackedBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true },
      },
    }),
    []
  )

  const completionRateVariant = (rate) => {
    if (rate >= 70) return 'good'
    if (rate >= 40) return 'warning'
    return 'danger'
  }

  if (analyticsError) {
    return (
      <div className="pageContent">
        <Link to="/app/therapist/patients" className={styles.back}>
          <ArrowLeft size={18} />
          Volver a Pacientes
        </Link>
        <p className={styles.error}>
          {analyticsError?.response?.data?.detail ?? 'Error al cargar análisis.'}
        </p>
      </div>
    )
  }

  return (
    <div className="pageContent analyticsPage">
      <Link to="/app/therapist/patients" className={styles.back}>
        <ArrowLeft size={18} />
        Volver a Pacientes
      </Link>

      <h1 className={styles.title}>Análisis del paciente</h1>

      <section className={styles.analyticsControls}>
        <div className={styles.analyticsDateGroup}>
          <label>Desde</label>
          <input
            type="date"
            lang="es-CL"
            value={range.date_from}
            onChange={(e) => setRange((r) => ({ ...r, date_from: e.target.value }))}
          />
        </div>
        <div className={styles.analyticsDateGroup}>
          <label>Hasta</label>
          <input
            type="date"
            lang="es-CL"
            value={range.date_to}
            onChange={(e) => setRange((r) => ({ ...r, date_to: e.target.value }))}
          />
        </div>
        <div className={styles.analyticsGranularity}>
          <label>Granularidad</label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
          >
            {GRANULARITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {analyticsLoading ? (
        <div className="summaryCards">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeletonCard" />
          ))}
        </div>
      ) : analytics?.summary ? (
        <section className="summaryCards">
          <Card className="summaryCard">
            <div className="summaryCardIcon">
              <BookOpen size={24} />
            </div>
            <div className="summaryCardValue">
              {analytics.summary.total_journal_entries}
            </div>
            <div className="summaryCardLabel">Total entradas de diario</div>
          </Card>
          <Card
            className={`summaryCard summaryCard--${completionRateVariant(analytics.summary.avg_completion_rate)}`}
          >
            <div className="summaryCardIcon">
              <CheckCircle size={24} />
            </div>
            <div className="summaryCardValue">
              {Number(analytics.summary.avg_completion_rate).toFixed(1)}%
            </div>
            <div className="summaryCardLabel">Tasa de cumplimiento</div>
          </Card>
          <Card className="summaryCard">
            <div className="summaryCardIcon">
              <span className={styles.summaryCardEmoji}>
                {analytics.summary.most_frequent_feeling?.emoji || '—'}
              </span>
            </div>
            <div className="summaryCardValue">
              {analytics.summary.most_frequent_feeling?.title ?? '—'}
            </div>
            <div className="summaryCardLabel">Sentimiento más frecuente</div>
          </Card>
          <Card className="summaryCard">
            <div className="summaryCardIcon">
              <Flame size={24} />
            </div>
            <div className="summaryCardValue">
              {analytics.summary.journal_streak}
            </div>
            <div className="summaryCardLabel">Racha (días con entradas)</div>
          </Card>
        </section>
      ) : null}

      <h2 className="chartTitle">Tareas vs estado de ánimo</h2>
      <div className="chartContainer">
        {analyticsLoading ? (
          <div className="skeleton skeletonChart" />
        ) : taskVsMoodChart ? (
          <Line data={taskVsMoodChart} options={chartOptions} />
        ) : (
          <div className="chartEmpty">
            Sin datos para el período seleccionado
          </div>
        )}
      </div>

      <section className="feelingSection">
        <h2 className="chartTitle">Sentimientos</h2>
        <FeelingTabs
          analytics={analytics}
          feelingTimelineChart={feelingTimelineChart}
          stackedBarOptions={stackedBarOptions}
          isLoading={analyticsLoading}
        />
      </section>

      <section>
        <h2 className="chartTitle">Comparativa entre pacientes (anonimizada)</h2>
        {comparisonLoading ? (
          <div className="skeleton skeletonTable" />
        ) : comparisonWithLabels.patients?.length > 0 ? (
          <>
            <div className="comparisonTableWrap">
              <table className="comparisonTable">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Cumplimiento %</th>
                    <th>Ratio positivo %</th>
                    <th>Frec. diario/semana</th>
                    <th>Semanas en tratamiento</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonWithLabels.patients.map((p, i) => (
                    <tr
                      key={p.patient_hash}
                      className={highlightIndex === i ? 'highlightRow' : ''}
                    >
                      <td>{p.label}</td>
                      <td>{p.avg_completion_rate.toFixed(1)}</td>
                      <td>{p.positive_feeling_ratio.toFixed(1)}</td>
                      <td>{p.journal_frequency_per_week.toFixed(2)}</td>
                      <td>{p.treatment_weeks}</td>
                    </tr>
                  ))}
                  <tr className="averageRow">
                    <td>Promedio</td>
                    <td>
                      {comparisonWithLabels.averages?.avg_completion_rate?.toFixed(1) ?? '—'}
                    </td>
                    <td>
                      {comparisonWithLabels.averages?.positive_feeling_ratio?.toFixed(1) ?? '—'}
                    </td>
                    <td>
                      {comparisonWithLabels.averages?.journal_frequency_per_week?.toFixed(2) ?? '—'}
                    </td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="comparisonNote">
              Datos anonimizados. Los identificadores no corresponden a nombres reales.
            </p>
          </>
        ) : (
          <p className="chartEmpty">
            No hay datos de comparativa para el período seleccionado.
          </p>
        )}
      </section>
    </div>
  )
}

function FeelingTabs({
  analytics,
  feelingTimelineChart,
  stackedBarOptions,
  isLoading,
}) {
  const [activeTab, setActiveTab] = useState('frequency')
  const frequency = analytics?.feeling_frequency || []
  const maxCount = Math.max(1, ...frequency.map((f) => f.count))

  return (
    <>
      <div className="feelingTabs">
        <button
          type="button"
          className={`feelingTab ${activeTab === 'frequency' ? 'active' : ''}`}
          onClick={() => setActiveTab('frequency')}
        >
          Frecuencia
        </button>
        <button
          type="button"
          className={`feelingTab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Evolución temporal
        </button>
      </div>
      {activeTab === 'frequency' && (
        <>
          {isLoading ? (
            <div className="skeleton skeletonChart" style={{ height: 200 }} />
          ) : frequency.length === 0 ? (
            <p className="chartEmpty">Sin datos de sentimientos</p>
          ) : (
            <div className="feelingBars">
              {frequency.slice(0, 8).map((item) => (
                <div key={item.feeling?.title} className="feelingBar">
                  <div className="feelingBarLabel">
                    <span className="feelingBarEmoji">{item.feeling?.emoji}</span>
                    <span>{item.feeling?.title}</span>
                  </div>
                  <div className="feelingBarTrack">
                    <div
                      className="feelingBarFill"
                      style={{
                        width: `${(item.count / maxCount) * 100}%`,
                        backgroundColor: item.feeling?.color || '#8a827a',
                      }}
                    />
                  </div>
                  <div className="feelingBarMeta">
                    {item.count} ({item.ratio.toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {activeTab === 'timeline' && (
        <div className="chartContainer">
          {isLoading ? (
            <div className="skeleton skeletonChart" />
          ) : feelingTimelineChart ? (
            <Bar data={feelingTimelineChart} options={stackedBarOptions} />
          ) : (
            <div className="chartEmpty">Sin datos de evolución temporal</div>
          )}
        </div>
      )}
    </>
  )
}
