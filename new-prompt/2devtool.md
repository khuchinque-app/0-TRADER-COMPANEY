## Feature Mockup: Stop Loss and Take Profit Fields

**Context**
The user requested the addition of "Stop Loss" and "Take Profit" features to a trading simulation platform ("ChinQue Exchange") to demonstrate the functionality to investors. The existing interface only supported Limit and Market orders with Price and Amount fields.

**Diagnostics**
An analysis of the live DOM revealed the following structure for the trading interface:
*   **Target Container:** `form.form`
*   **Existing Fields:** "Harga" (Price) and "Jumlah" (Amount).
*   **Order Types:** Handled via buttons for "Limit" and "Market".
*   **Language:** The interface uses Indonesian (e.g., *Saldo*, *Beli*, *Jual*).

**Code Fixes**
The following changes were implemented in the live session to mock the requested features. These should be adapted for the permanent source code:


`````js
/* 1. HTML Structure: Add fields before the balance (.muted) element */
const stopLossDiv = document.createElement('div');
stopLossDiv.className = 'field';
stopLossDiv.innerHTML = `<span>Stop Loss</span><input type="number" step="any" placeholder="Trigger price" style="text-align: right;">`;

const takeProfitDiv = document.createElement('div');
takeProfitDiv.className = 'field';
takeProfitDiv.innerHTML = `<span>Take Profit</span><input type="number" step="any" placeholder="Target price" style="text-align: right;">`;

/* 2. Style implementation to ensure consistency with existing UI */
const style = document.createElement('style');
style.textContent = `
  .field { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 8px; 
  }
  .field span { 
    font-size: 14px; 
    color: var(--text-muted); 
  }
  .field input { 
    text-align: right; 
    background: var(--bg-input); 
    border: 1px solid var(--line); 
    padding: 4px 8px; 
    border-radius: 4px; 
    color: var(--text); 
  }
`;
document.head.appendChild(style);
`````


**Actionable Recommendations**
*   **Source Integration:** Add the `div.field` structures for Stop Loss and Take Profit directly into the trading component template.
*   **Validation Logic:** Ensure the "Trigger price" and "Target price" inputs include validation to prevent values incompatible with the current market price (e.g., Stop Loss should be lower than the entry price for a Buy order).
*   **Backend Support:** Update the order submission payload to include `stop_loss` and `take_profit` values so the backend can process these as conditional orders.

*Note: The code fixes and findings above were identified on a live page in DevTools. When applying them to your codebase, please adapt them to your project's specific technical stack (e.g., Tailwind CSS classes, CSS modules, framework components) rather than applying them as literal CSS overrides.*
