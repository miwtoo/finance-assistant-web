import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Card,
  CardContent,
  Alert,
  Stack,
  Chip,
  Box,
  CircularProgress,
} from "@mui/material";


/* ---------- types ---------- */

interface ExpenseDraft {
  amount: number;
  currency: string;
  description: string;
  spentAt: string;
  merchant: string | null;
  categoryHint: string | null;
  confidence: number;
  rawText: string;
}

interface ConfirmedDraft extends ExpenseDraft {
  id: string;
  confirmedAt: string;
  syncStatus?: "idle" | "syncing" | "synced" | "error";
  syncedAt?: string;
  fireflyTransactionId?: string | null;
  syncError?: string;
}

/* ---------- constants ---------- */

const STORAGE_KEY = "fa-confirmed-drafts";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/* ---------- helpers ---------- */

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function loadConfirmed(): ConfirmedDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConfirmedDraft[]) : [];
  } catch {
    return [];
  }
}

function saveConfirmed(drafts: ConfirmedDraft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

/* ---------- component ---------- */

export function HomePage() {
  const [inputText, setInputText] = useState("");
  const [parseStatus, setParseStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [parseError, setParseError] = useState("");
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [confirmedDrafts, setConfirmedDrafts] = useState<ConfirmedDraft[]>(loadConfirmed);

  // Editable fields derived from draft
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSpentAt, setEditSpentAt] = useState("");
  const [editMerchant, setEditMerchant] = useState("");
  const [editCategoryHint, setEditCategoryHint] = useState("");
  const [validationError, setValidationError] = useState("");

  // Sync confirmed drafts to localStorage
  useEffect(() => {
    saveConfirmed(confirmedDrafts);
  }, [confirmedDrafts]);

  /* ---- parse ---- */

  const handleParse = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    setParseStatus("loading");
    setParseError("");
    setDraft(null);

    try {
      const res = await fetch(`${API_BASE}/api/parse-expense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setParseStatus("error");
        setParseError(data.error || `HTTP ${res.status}`);
        return;
      }

      const result = data.draft as ExpenseDraft;
      setDraft(result);
      setEditAmount(String(result.amount));
      setEditCurrency(result.currency);
      setEditDescription(result.description);
      setEditSpentAt(result.spentAt);
      setEditMerchant(result.merchant ?? "");
      setEditCategoryHint(result.categoryHint ?? "");
      setParseStatus("success");
    } catch (err) {
      setParseStatus("error");
      setParseError(err instanceof Error ? err.message : "Network error");
    }
  }, [inputText]);

  /* ---- cancel ---- */

  const handleCancel = useCallback(() => {
    setDraft(null);
    setParseStatus("idle");
    setParseError("");
    setValidationError("");
  }, []);

  /* ---- confirm locally ---- */

  const handleConfirm = useCallback(() => {
    if (!draft) return;

    setValidationError("");

    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setValidationError("Amount must be a positive number.");
      return;
    }

    const currency = editCurrency.trim();
    if (!currency) {
      setValidationError("Currency is required.");
      return;
    }

    const description = editDescription.trim();
    if (!description) {
      setValidationError("Description is required.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(editSpentAt)) {
      setValidationError("Date must be in YYYY-MM-DD format.");
      return;
    }

    const confirmed: ConfirmedDraft = {
      ...draft,
      amount,
      currency: currency.toUpperCase(),
      description,
      spentAt: editSpentAt,
      merchant: editMerchant || null,
      categoryHint: editCategoryHint || null,
      id: generateId(),
      confirmedAt: new Date().toISOString(),
    };

    setConfirmedDrafts((prev) => [...prev, confirmed]);
    handleCancel();
  }, [draft, editAmount, editCurrency, editDescription, editSpentAt, editMerchant, editCategoryHint, handleCancel]);

  /* ---- sync to ledger ---- */

  const handleSyncDraft = useCallback(async (id: string) => {
    setConfirmedDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, syncStatus: "syncing" as const, syncError: undefined } : d)),
    );

    const draft = confirmedDrafts.find((d) => d.id === id);
    if (!draft) return;

    try {
      const res = await fetch(`${API_BASE}/api/sync-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          amount: draft.amount,
          currency: draft.currency,
          description: draft.description,
          spentAt: draft.spentAt,
          merchant: draft.merchant,
          categoryHint: draft.categoryHint,
          confidence: draft.confidence,
          rawText: draft.rawText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setConfirmedDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, syncStatus: "error" as const, syncError: data.error || `HTTP ${res.status}` }
              : d,
          ),
        );
        return;
      }

      setConfirmedDrafts((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                syncStatus: "synced" as const,
                syncedAt: new Date().toISOString(),
                fireflyTransactionId: data.transactionId ?? null,
              }
            : d,
        ),
      );
    } catch (err) {
      setConfirmedDrafts((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, syncStatus: "error" as const, syncError: err instanceof Error ? err.message : "Network error" }
            : d,
        ),
      );
    }
  }, [confirmedDrafts]);

  /* ---- render ---- */

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Finance Assistant
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Describe an expense you already paid. We&apos;ll parse it into a draft.
      </Typography>

      {/* Input section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Describe your expense"
            multiline
            minRows={3}
            maxRows={6}
            fullWidth
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g. Paid 350 baht for lunch at the food court today"
            disabled={parseStatus === "loading"}
          />
          <Button
            variant="contained"
            onClick={handleParse}
            disabled={!inputText.trim() || parseStatus === "loading"}
          >
            {parseStatus === "loading" ? <CircularProgress size={24} /> : "Parse with AI"}
          </Button>
        </Stack>
      </Paper>

      {/* Error */}
      {parseStatus === "error" && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {parseError}
        </Alert>
      )}

      {/* Draft card */}
      {draft && (
        <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Parsed Draft</Typography>
            <Chip
              label={`Confidence: ${Math.round(draft.confidence * 100)}%`}
              color={draft.confidence > 0.7 ? "success" : draft.confidence > 0.4 ? "warning" : "error"}
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Chat-based correction will be available later &mdash; edit fields now.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
            <TextField
              label="Currency"
              fullWidth
              value={editCurrency}
              onChange={(e) => setEditCurrency(e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <TextField
              label="Date (YYYY-MM-DD)"
              fullWidth
              value={editSpentAt}
              onChange={(e) => setEditSpentAt(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <TextField
              label="Merchant (optional)"
              fullWidth
              value={editMerchant}
              onChange={(e) => setEditMerchant(e.target.value)}
            />
            <TextField
              label="Category Hint (optional)"
              fullWidth
              value={editCategoryHint}
              onChange={(e) => setEditCategoryHint(e.target.value)}
            />
            {validationError && (
              <Alert severity="warning">{validationError}</Alert>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" color="primary" onClick={handleConfirm}>
                Confirm Locally
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Confirmed drafts */}
      {confirmedDrafts.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Confirmed Drafts ({confirmedDrafts.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Sync confirmed drafts to your ledger (Firefly III). The backend uses a configured Firefly source account.
          </Typography>
          <Stack spacing={2}>
            {confirmedDrafts.map((cd) => (
              <Card key={cd.id} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1">{cd.description}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cd.amount.toFixed(2)} {cd.currency} &middot; {cd.spentAt}
                    {cd.merchant ? ` · ${cd.merchant}` : ""}
                    {cd.categoryHint ? ` · ${cd.categoryHint}` : ""}
                  </Typography>
                  <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    {cd.syncStatus === "synced" ? (
                      <>
                        <Chip label="Synced to Ledger" color="success" size="small" />
                        {cd.fireflyTransactionId && (
                          <Typography variant="caption" color="text.secondary">
                            ID: {cd.fireflyTransactionId}
                          </Typography>
                        )}
                      </>
                    ) : cd.syncStatus === "error" ? (
                      <>
                        <Chip label="Sync Error" color="error" size="small" />
                        {cd.syncError && (
                          <Typography variant="caption" color="error">
                            {cd.syncError}
                          </Typography>
                        )}
                        <Button size="small" variant="outlined" onClick={() => handleSyncDraft(cd.id)}>
                          Retry Sync
                        </Button>
                      </>
                    ) : cd.syncStatus === "syncing" ? (
                      <>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Syncing...
                        </Typography>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSyncDraft(cd.id)}
                      >
                        Sync to Ledger
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}
    </Container>
  );
}
