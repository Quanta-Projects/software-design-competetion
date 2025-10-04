# Errors Component Documentation

## Overview
The Errors component displays anomaly detection results from the AI thermal analysis model. It shows detected errors with timestamps and provides visual feedback when no errors are found.

## Features
- ✅ Dynamic error list from backend API
- ✅ Error numbering (Error 1, Error 2, etc.)
- ✅ Timestamps with detected-by information
- ✅ Loading state indicator
- ✅ "No errors detected" message when list is empty
- ✅ Responsive card-based layout
- ✅ Color-coded error badges

## UI Components

### Error Card Structure
```
┌─────────────────────────────────────────────────┐
│ Errors                    2025/12/15 - Mark Henry│
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ [Error 1] 15/08/2025 10:15 - AI         │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ [Error 2] 15/08/2025 10:15 - Mark Henry │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### States

#### Loading State
```
┌─────────────────────────────────────────────────┐
│ Errors                                          │
├─────────────────────────────────────────────────┤
│        ⏳ Loading errors...                     │
└─────────────────────────────────────────────────┘
```

#### No Errors State
```
┌─────────────────────────────────────────────────┐
│ Errors                                          │
├─────────────────────────────────────────────────┤
│        ✓ No errors detected                     │
└─────────────────────────────────────────────────┘
```

## Backend API Integration

### Endpoint
```
GET /api/anomalies/inspection/{inspectionId}
```

### Expected Response Format
```json
{
  "anomalies": [
    {
      "id": "string",
      "errorType": "string",
      "timestamp": "2025-08-15T10:15:00Z",
      "detectedBy": "AI" | "Mark Henry",
      "description": "string (optional)"
    }
  ]
}
```

### Example Response
```json
{
  "anomalies": [
    {
      "id": "ano-001",
      "errorType": "Thermal Anomaly",
      "timestamp": "2025-08-15T10:15:00Z",
      "detectedBy": "AI",
      "description": "High temperature difference detected"
    },
    {
      "id": "ano-002",
      "errorType": "Loose Joint",
      "timestamp": "2025-08-15T10:15:00Z",
      "detectedBy": "Mark Henry",
      "description": "Manual verification required"
    }
  ]
}
```

## State Management

### State Variables
```javascript
const [anomalyErrors, setAnomalyErrors] = useState([]);
const [loadingErrors, setLoadingErrors] = useState(false);
```

### Data Flow
1. Component mounts → `useEffect` triggers
2. Check if `transformerId` and `inspectionId` exist
3. Set `loadingErrors` to `true`
4. Fetch from API: `GET /api/anomalies/inspection/{inspectionId}`
5. On success: Update `anomalyErrors` with response data
6. On error: Set `anomalyErrors` to empty array
7. Set `loadingErrors` to `false`

## Styling

### Color Scheme
- **Error Badge 1**: `#dc3545` (Bootstrap danger red)
- **Error Badge 2+**: `#c82333` (Darker red)
- **Background**: `#f8f9fa` (Light gray)
- **Border**: `#e9ecef` (Lighter gray)
- **Success Icon**: `#28a745` (Bootstrap success green)

### Error Badge Styles
```css
{
  backgroundColor: "#dc3545",  /* Red for Error 1 */
  color: "white",
  fontSize: "0.85rem",
  padding: "6px 12px",
  borderRadius: "6px",
  fontWeight: "600"
}
```

## Component Code Location

### File
`/Front-end/src/pages/previewPage.jsx`

### Key Sections
1. **State Declaration** (Lines ~177-186)
2. **API Fetch Logic** (Lines ~463-510)
3. **UI Rendering** (Lines ~701-769)

## Usage Example

### Rendering Errors
The component automatically:
- Fetches errors when page loads
- Shows loading spinner during fetch
- Displays errors with proper formatting
- Shows "No errors" message when empty

### Error Item Format
Each error displays:
```
[Error N] MM/DD/YYYY HH:MM - Detected By • Description
```

Example:
```
[Error 1] 08/15/2025 10:15 - AI • High temperature difference detected
```

## Testing

### Test Scenarios

#### 1. No Errors
- API returns `{ anomalies: [] }`
- Expected: "No errors detected" message with green checkmark

#### 2. Single Error
- API returns array with 1 error
- Expected: One error badge labeled "Error 1"

#### 3. Multiple Errors
- API returns array with N errors
- Expected: N error badges labeled "Error 1" through "Error N"

#### 4. API Failure
- API returns error or is unreachable
- Expected: Empty state (no errors detected)

#### 5. Loading State
- During API call
- Expected: Loading spinner with "Loading errors..." text

### Mock Data for Testing
```javascript
// Add to component for testing
useEffect(() => {
  // Mock data for testing
  setAnomalyErrors([
    {
      id: "test-1",
      errorType: "Thermal Anomaly",
      timestamp: "2025-08-15T10:15:00Z",
      detectedBy: "Mark Henry",
      description: "High temperature difference"
    },
    {
      id: "test-2",
      errorType: "Loose Joint",
      timestamp: "2025-08-15T10:15:00Z",
      detectedBy: "AI"
    }
  ]);
}, []);
```

## Future Enhancements

### Potential Features
1. **Filtering**: Filter by date, type, or detection method
2. **Sorting**: Sort by timestamp, type, or severity
3. **Details Modal**: Click error to see full details
4. **Export**: Download errors as CSV/PDF
5. **Real-time Updates**: WebSocket for live error detection
6. **Severity Levels**: Color-code by severity (warning, critical, etc.)
7. **Pagination**: For large error lists
8. **Search**: Search errors by description or type

### Dropdown Filter (Currently Placeholder)
The component includes a placeholder for date/inspector filtering:
```jsx
<div className="d-flex align-items-center gap-2 text-muted">
  <i className="bi bi-clock-history"></i>
  <span>2025/12/15 - Mark Henry</span>
</div>
```

This can be converted to a dropdown for filtering errors by date range or inspector.

## Dependencies
- React Bootstrap (`Card`, `Button`, etc.)
- Bootstrap Icons (`bi-clock-history`, `bi-check-circle`, `bi-hourglass-split`)
- Date formatting: Native JavaScript `Date.toLocaleString()`

## Browser Compatibility
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅

## Accessibility
- Semantic HTML with proper heading hierarchy
- Color contrast meets WCAG AA standards
- Icon labels for screen readers
- Keyboard navigation support

## Notes
- Error numbering starts from 1 (not 0)
- Timestamps are formatted in US locale (MM/DD/YYYY HH:MM)
- API endpoint must be implemented in backend
- Component handles API failures gracefully
- Description field is optional
