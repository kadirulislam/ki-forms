import { useState } from "react"
import type { Field } from "../../src/types"
import {
  AI_PROMPT_EXAMPLES,
  buildSystemPrompt,
  buildUserPrompt,
  completionsUrl,
  generateSchema,
  loadAiSettings,
  saveAiEndpoint,
  saveAiKey,
  AI_KEY_SESSION_KEY,
} from "../lib/ai"
import { parseDocumentImportAll, type DocumentImport } from "../lib/schema"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { ConfirmApplyDialog, ValidationSummary } from "./StudioModal"
import { Sparkles } from "lucide-react"

export type AiPanelProps = {
  fields: Field[]
  onApplyDocument: (doc: DocumentImport) => void
}

function readSessionKey(): string {
  try {
    return sessionStorage.getItem(AI_KEY_SESSION_KEY) ?? ""
  } catch {
    return ""
  }
}

export function AiPanel({ fields, onApplyDocument }: AiPanelProps) {
  const [settings] = useState(loadAiSettings)
  const [endpoint, setEndpoint] = useState(settings.endpoint)
  const [model, setModel] = useState(settings.model)
  const [apiKey, setApiKey] = useState(readSessionKey)
  const [description, setDescription] = useState("")
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[] | null>(null)
  const [proposal, setProposal] = useState<DocumentImport | null>(null)
  const [confirm, setConfirm] = useState(false)

  const canGenerate = description.trim() !== "" && apiKey !== "" && !working

  const generate = async () => {
    setWorking(true)
    setError(null)
    setIssues(null)
    setProposal(null)
    saveAiEndpoint(endpoint, model)
    const result = await generateSchema({
      endpoint,
      apiKey,
      model,
      systemPrompt: buildSystemPrompt(),
      userPrompt: buildUserPrompt(description, fields),
    })
    setWorking(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const parsed = parseDocumentImportAll(result.raw)
    if (!parsed.ok) {
      setIssues(parsed.errors)
      return
    }
    setProposal(parsed.doc)
  }

  const requestApply = () => {
    if (!proposal) return
    if (fields.length > 0) setConfirm(true)
    else apply()
  }

  const apply = () => {
    if (!proposal) return
    onApplyDocument(proposal)
    setProposal(null)
    setConfirm(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" /> Describe the form
        </div>
        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A signup form: work email (required), password (min 8 chars), role select…"
          aria-label="Form description"
          className="w-full resize-y overflow-auto rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-studio-accent focus-visible:ring-studio-accent/30 focus-visible:ring-[3px]"
        />
        <div className="flex flex-wrap gap-1.5">
          {AI_PROMPT_EXAMPLES.map((ex) => (
            <Button key={ex.id} variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setDescription(ex.prompt)}>
              {ex.label}
            </Button>
          ))}
        </div>
        <Button size="sm" disabled={!canGenerate} onClick={generate}>
          {working ? "Generating…" : "Generate schema"}
        </Button>
        {apiKey === "" && (
          <p className="text-[11px] text-muted-foreground">Add a session-only API key below to enable generation.</p>
        )}
      </section>

      <ValidationSummary error={error} issues={(issues ?? []).map((message) => ({ message }))} />

      {proposal && (
        <section className="flex flex-col gap-2 rounded-lg border border-studio-accent/40 p-3">
          <div className="text-xs font-semibold">Proposed schema — review before applying</div>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <strong className="font-medium text-foreground">{proposal.fields.length} fields</strong>
            {proposal.fields.length > 0 && (
              <span> — {proposal.fields.slice(0, 6).map((f) => f.name).join(", ")}{proposal.fields.length > 6 ? ` +${proposal.fields.length - 6} more` : ""}</span>
            )}
            <span className="ml-2">· {proposal.variant}</span>
            {Object.keys(proposal.theme).length > 0 && <span> · {Object.keys(proposal.theme).length} theme tokens</span>}
            {proposal.endpoint && <span> · endpoint set</span>}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {fields.length > 0 ? "Applying replaces the current canvas (undoable with Ctrl+Z)." : "Applying fills the empty canvas."}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={requestApply}>
              Apply to canvas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setProposal(null)}>
              Discard
            </Button>
          </div>
        </section>
      )}

      <Separator />

      <section className="flex flex-col gap-2.5">
        <div className="text-xs font-medium text-muted-foreground">Provider (bring your own key)</div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-endpoint" className="text-xs text-muted-foreground">Endpoint</Label>
          <Input
            id="ai-endpoint"
            value={endpoint}
            onChange={(e) => {
              setEndpoint(e.target.value)
              saveAiEndpoint(e.target.value, model)
            }}
            placeholder="https://api.openai.com/v1"
            className="h-8 font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Requests go to <code className="font-mono">{/^https?:\/\//i.test(endpoint.trim()) ? completionsUrl(endpoint) : "…"}</code>
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-model" className="text-xs text-muted-foreground">Model</Label>
          <Input
            id="ai-model"
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              saveAiEndpoint(endpoint, e.target.value)
            }}
            placeholder="gpt-4o-mini"
            className="h-8 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-key" className="text-xs text-muted-foreground">API key (session only)</Label>
          <Input
            id="ai-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              saveAiKey(e.target.value)
            }}
            placeholder="sk-…"
            className="h-8 font-mono text-xs"
          />
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          The key lives in <code>sessionStorage</code> only — it never touches the document, localStorage, or share
          links. Requests go straight from your browser to the endpoint above.
        </p>
      </section>

      <ConfirmApplyDialog
        open={confirm}
        onConfirm={apply}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
