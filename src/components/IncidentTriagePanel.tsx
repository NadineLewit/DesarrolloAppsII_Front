import { useState, type FormEvent } from 'react'
import { obrasApi } from '../api/obrasApi'
import type { IncidentTriageSuggestion } from '../types'

const categories = ['PAVEMENT', 'SIDEWALK', 'STREETLIGHT', 'DRAINAGE', 'TREE', 'STRUCTURE', 'OTHER'] as const
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const resources = ['ROAD_CREW', 'SIDEWALK_CREW', 'ELECTRICAL_CREW', 'DRAINAGE_CREW', 'ARBORIST', 'STRUCTURAL_INSPECTION', 'MANUAL_REVIEW'] as const

export function IncidentTriagePanel() {
  const [description, setDescription] = useState('')
  const [suggestion, setSuggestion] = useState<IncidentTriageSuggestion | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setReviewed(false)
    try {
      setSuggestion(await obrasApi.triageIncident(description.trim()))
    } catch (failure) {
      setSuggestion(null)
      setError(failure instanceof Error ? failure.message : 'No se pudo obtener la sugerencia.')
    } finally {
      setLoading(false)
    }
  }

  function update<K extends keyof IncidentTriageSuggestion>(key: K, value: IncidentTriageSuggestion[K]) {
    setSuggestion((current) => current ? { ...current, [key]: value } : current)
    setReviewed(false)
  }

  return (
    <section className="triage-panel" aria-labelledby="triage-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Asistencia supervisada</p>
          <h2 id="triage-title">Clasificar un incidente</h2>
        </div>
        <span className="badge status">No ejecuta acciones</span>
      </div>
      <p className="helper-text">
        La herramienta sugiere una clasificación. Una persona debe revisarla y corregirla antes de usarla.
      </p>
      <form onSubmit={submit} className="triage-form">
        <label>
          Descripción del incidente
          <textarea
            required
            minLength={10}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ejemplo: bache profundo frente a una escuela"
          />
        </label>
        <button type="submit" disabled={loading || description.trim().length < 10}>
          {loading ? 'Analizando…' : 'Obtener sugerencia'}
        </button>
      </form>

      {error && <div className="notice error" role="alert">{error}</div>}

      {suggestion && (
        <div className="triage-result" aria-live="polite">
          <div className="triage-confidence">
            <strong>{suggestion.summary}</strong>
            <span>Confianza orientativa: {Math.round(suggestion.confidence * 100)}%</span>
          </div>
          <div className="form-grid">
            <label>
              Categoría
              <select value={suggestion.damageCategory} onChange={(event) => update('damageCategory', event.target.value as IncidentTriageSuggestion['damageCategory'])}>
                {categories.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>
              Prioridad sugerida
              <select value={suggestion.suggestedPriority} onChange={(event) => update('suggestedPriority', event.target.value as IncidentTriageSuggestion['suggestedPriority'])}>
                {priorities.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>
              Recurso recomendado
              <select value={suggestion.recommendedResourceType} onChange={(event) => update('recommendedResourceType', event.target.value as IncidentTriageSuggestion['recommendedResourceType'])}>
                {resources.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <ul>{suggestion.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <label className="review-confirmation">
            <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
            Revisé la sugerencia como persona responsable.
          </label>
          {reviewed && <div className="notice success">Revisión humana registrada en esta pantalla. No se creó ni modificó ninguna orden.</div>}
        </div>
      )}
    </section>
  )
}
