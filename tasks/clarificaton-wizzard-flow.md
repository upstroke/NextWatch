Title
Implement the clarification wizard and explicit search confirmation

Work package
Search UI and clarification workflow
New UI/integration work package; number to be assigned after checking
the current work-package plan.

Objective
Implement a guided clarification flow between natural-language input
and search execution.

The wizard temporarily replaces the search input, guides the user
through unresolved requests, and ends with a filter review.

A title search must only start after the user explicitly clicks
“Search now”.

Agreed product flow

With clarification:
Search input
→ Clarification steps
→ Filter review
→ “Search now”
→ Search input with the confirmed query and results below

Without clarification:
Search input
→ Filter review
→ “Search now”
→ Search input with the confirmed query and results below

Scope

1. Interpret the submitted request

- Use the parser contract to distinguish ready, needs_clarification
  and unsupported outcomes.
- Do not execute a title search merely because interpretation
  completed successfully.
- Preserve the currently executed search while the new request
  is being clarified or reviewed.

2. Display the clarification wizard

- Completely hide the search input while the wizard is visible.
- Render the wizard in the same central content area.
- Do not use a modal or overlay.
- Present one clarification question per step.
- Render application-controlled questions and supported answer options.
- Clearly indicate the selected option.
- Do not display technical entity IDs.

3. Support wizard navigation

- “Next” confirms the current answer and advances.
- “Back” returns to the previous available step.
- “Skip this request” omits the current unresolved request without
  silently substituting another criterion.
- Preserve previous answers when navigating.
- Revalidate dependent steps when an earlier answer changes.
- Calculate progress from the actual clarification steps and final review.
- Prepared answer selections must not trigger another LLM call.

4. Review the proposed filters

- After all required clarifications are resolved or explicitly skipped,
  show “Review your search filters”.
- If no clarification is needed, open this review directly.
- Display the exact effective filters proposed for execution,
  including retained criteria where applicable.
- Do not present unresolved, unsupported or skipped requests as
  successfully applied filters.
- Provide “Back” where a previous clarification step exists.
- Provide “Search now” as the primary action.
- Do not execute the search when entering this screen.

5. Confirm and execute

- “Search now” validates and submits the reviewed search.
- Reuse the existing domain validation and search-execution boundaries.
- Reject stale proposals rather than applying them to a changed state.
- Hide the wizard and restore the existing search input.
- Display a readable representation of the confirmed search in the input.
- Ensure this representation matches the executed criteria and does not
  claim that skipped or unsupported wishes were fulfilled.
- Show loading, results, empty results and technical errors through
  the existing search-result UI below the input.
- Never represent a technical failure as zero results.

State and architecture boundaries

- Keep the proposed search separate from the currently executed search
  until explicit confirmation.
- Reuse existing clarification, correction, revision and guardrail logic.
- Do not duplicate domain rules inside UI components.
- The application controls transitions, validation and search execution.
- The LLM does not control navigation or call search services.
- Do not introduce persistent storage of user requests or conversations.
- Keep visible text localizable; use English for the supplied design.

Acceptance criteria

1. A request requiring clarification replaces the search input with
   the wizard.
2. Search input and wizard are never displayed simultaneously.
3. Each clarification step presents one question.
4. Selecting an answer does not execute a title search.
5. Back navigation preserves valid answers.
6. Skipping a request does not apply that request or an invented substitute.
7. Changing an earlier answer invalidates dependent answers where required.
8. Both ready requests and clarified requests reach a filter review.
9. Completing the final clarification does not execute a title search.
10. Only “Search now” commits and executes the reviewed search.
11. The reviewed filters and executed filters match.
12. After confirmation, the search input returns with the confirmed query,
    and matching titles appear below it.
13. Stale answers and stale confirmations cannot overwrite newer state.
14. Keyboard operation, focus transitions and selection states are accessible.
15. Technical errors remain distinguishable from empty results.

Tests

Add unit/integration and UI tests covering:

- Direct transition from ready interpretation to review.
- Single-step and multi-step clarification.
- Selection, back navigation and skipping.
- Changes that invalidate dependent answers.
- No title-search execution before explicit confirmation.
- Exactly one execution for a valid confirmation.
- Protection against stale answers and stale confirmations.
- Restoration of the search input and existing result presentation.
- Keyboard navigation and focus handling.

Dependencies

- WP 010: existing clarification and guardrail domain behavior.
- WP 011: parser input/output contract.
- WP 012: search execution.
- Entity-resolution integration for supported person and keyword options;
  confirm its current work-package assignment before implementation.
- Existing search-input and result-grid components.

Mocks may be used for UI development, but end-to-end completion requires
the corresponding integrations.

Required specification updates

Before implementation, align the product specification and affected
execution contracts with explicit confirmation:

A ready interpretation does not automatically execute a title search.
Both ready and clarified requests require “Search now”.

Confirm how the pending proposal is represented without changing the
currently executed search prematurely.

Out of scope

- Reopening or reimplementing completed WP 010 domain work.
- Implementing the local LLM provider or parser endpoint.
- Implementing entity resolution within this UI task.
- Redesigning the result grid or detail pages.
- Autonomous searches, automatic filter relaxation or model-driven retries.

![UI-Clarifiation](docs/images/clarification-wizzard_dark_desktop.png)
