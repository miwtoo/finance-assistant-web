Feature: MVP Expense Capture
  As a user
  I want to capture an already-paid THB expense through a local draft
  So that I can review and confirm the expense locally

  Background:
    Given the page is loaded
    And the parse API responds successfully

  # ------------------------------------------------------------------
  @critical
  Scenario: Full flow — parse, edit, confirm locally, and persist across reload
    When I type "Paid 350 baht for lunch at the food court today"
    And I click "Parse with AI"
    Then I should see a parsed draft with amount "350", currency "THB", description "Lunch at food court", confidence "95%"
    And the date should be "2026-06-06"
    And the merchant should be "Food Court"
    And the category hint should be "food"
    When I change amount to "380"
    And I change description to "Lunch at central food court"
    And I change the date to "2026-06-07"
    And I change merchant to "Central Plaza"
    And I change category to "dining"
    And I click "Confirm Locally"
    Then the draft card should disappear
    And I should see "Lunch at central food court" in the confirmed drafts section
    And I should see "380.00 THB" in the confirmed drafts section
    And I should see "2026-06-07" in the confirmed drafts section
    And I should see "Central Plaza" in the confirmed drafts section
    And I should see "dining" in the confirmed drafts section
    When I reload the page
    Then I should see "Lunch at central food court" in the confirmed drafts section
    And I should see "380.00 THB" in the confirmed drafts section
    And I should see "2026-06-07" in the confirmed drafts section
    And I should see "Central Plaza" in the confirmed drafts section
    And I should see "dining" in the confirmed drafts section

  # ------------------------------------------------------------------
  @error-handling
  Scenario: Parse API error is displayed
    Given the parse API will return an error with status 400 and message "Missing or invalid 'text' field"
    When I type "Paid 350 baht for lunch"
    And I click "Parse with AI"
    Then I should see an error "Missing or invalid 'text' field"

  # ------------------------------------------------------------------
  @error-handling
  Scenario: Validation error when amount is cleared on confirm
    Given the parse API will return a valid draft
    When I type "Paid 350 baht for lunch"
    And I click "Parse with AI"
    And I clear the amount field
    And I click "Confirm Locally"
    Then I should see a validation error "Amount must be a positive number."

  # ------------------------------------------------------------------
  @critical
  Scenario: Cancel clears draft card
    Given the parse API will return a valid draft
    When I type "Paid 350 baht for lunch"
    And I click "Parse with AI"
    And I click "Cancel"
    Then I should not see the draft card

  # ------------------------------------------------------------------
  @loading-states
  Scenario: Disabled states while loading
    Given the parse API will respond after 1 second
    When I type "Paid 350 baht for lunch"
    And I click "Parse with AI"
    Then the parse button should show a spinner and be disabled
    And the textarea should be disabled
    When the parse completes
    Then I should see a valid draft
