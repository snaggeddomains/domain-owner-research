# Eval harness

Regression tests for the research agent. Each fixture under `fixtures/` declares
a domain and the verified contacts a good run should surface. The runner does a
real **deep-pass** research run and checks the report markdown for those
strings, normalized.

Use this to catch silent regressions on the failure modes we've already learned
about — e.g. the OnTask.ai miss that prompted the **MULTI-PATH OWNER LOOKUP**
rule in `lib/agent.js` SYSTEM_PROMPT. A run on `ontask.ai` that doesn't surface
`samp@ontask.ai`, `putnam.sam@gmail.com`, and `+1 214 901 2140` should fail.

## ⚠ Cost

Every fresh run is a real deep pass — it spends paid-API credits (DomainIQ,
BigDomainData, WhoisXML, Whoxy, RocketReach lookup, web search) and LLM tokens.
A single fixture is a few dollars; running `--all` scales linearly. Don't wire
into CI without an opt-in gate and a budget.

## Run it

The runner uses `lib/agent.js`'s `research()` directly. From the
`domain-research/` directory, with the same env vars production uses:

```bash
# load env (one-off)
set -a; source .env; set +a

# one fixture (fresh deep pass — spends real credits)
node evals/run.js ontask.ai

# several
node evals/run.js ontask.ai wildblue.com

# every fixture in evals/fixtures/
node evals/run.js --all

# CHEAP: assert against the most recent stored 'done' run for the domain
# (zero paid-API credits — useful after a prompt edit to re-check a fixture
# whose latest stored run is still recent and meaningful)
node evals/run.js ontask.ai --against-latest
```

Exit code is `0` if all evals passed, `1` if any failed, `2` for usage errors.

## Add a fixture

Create `evals/fixtures/<domain>.json`:

```json
{
  "domain": "<domain>",
  "notes": "What's tricky about this case; what regression it would catch.",
  "expected_present": {
    "emails": ["expected@somewhere.com"],
    "phones": ["12125551234"]
  }
}
```

- `emails` are matched case-insensitively as substrings of the report.
- `phones` are normalized to digits-only on both sides, so `+1 (212) 555-1234`
  in the report matches `"12125551234"` in the fixture.
- Keep expectations to **verified personal contacts** — role addresses
  (`hello@…`) and registrar relays are not what we're checking.

## What this isn't yet

- Doesn't store result history (each run is point-in-time).
- Doesn't gate prompt-edit merges automatically.
- Doesn't read the structured `report` JSON (the report is currently markdown);
  if/when synthesis emits a structured contacts block, assertions should move to
  that.
