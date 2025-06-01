# Privacy Policy - AI Code Review Assistant

**Last updated:** June 1, 2025

> **Quick Summary:** This extension only stores your API key locally on your device. We don't collect, store, or share any personal information or code content.

## ⚠️ Important Disclaimer

**WE ARE NOT RESPONSIBLE FOR YOUR DATA AFTER IT'S SENT TO GOOGLE GEMINI AI**

By using this extension, you acknowledge and agree that:

- **Your code content** will be transmitted to Google's Gemini AI service
- **Google processes** this data according to their own privacy policy and terms
- **We have no control** over how Google handles, stores, or processes your data
- **You are solely responsible** for ensuring you have permission to share the code
- **We are not liable** for any data breaches, unauthorized access, or misuse by Google or third parties

## 📊 Data Collection Summary

### ❌ We DO NOT collect:

- ✅ **Personal information** (name, email, phone number)
- ✅ **Browsing history** or web habits
- ✅ **Device fingerprinting** data
- ✅ **Analytics or tracking** data
- ✅ **Cookies** for tracking purposes
- ✅ **User behavior** analytics
- ✅ **IP addresses** or location data
- ✅ **GitHub account** information
- ✅ **Repository metadata** beyond what's needed for analysis

### 💾 We DO store locally:

- 🔑 **Your Google Gemini API key** (encrypted in browser storage)
- ⚙️ **Selected AI model** preference
- 🎛️ **Extension settings** and configuration
- 📍 **Storage location**: Your device only (Chrome sync storage + local fallback)

### 📤 Data sent to third parties:

- **Only to Google AI**: Code content when you click "AI Review"
- **Purpose**: Code analysis and review suggestions only
- **Control**: You decide when to send data by clicking the button
- **Content**: Only the diff/changes from GitHub PR pages
- **No personal data**: Only code content is transmitted

## 1. Information We Collect

AI Code Review Assistant collects minimal information to function:

- **API Key:** Your Google Gemini AI API key is stored locally on your device using Chrome's secure storage
- **Settings:** Extension preferences and configuration settings
- **No Personal Data:** We do not collect names, emails, or any personal information
- **No Code Storage:** Code content is only temporarily processed for analysis and not stored

## 2. How We Use Information

- API keys are used solely to communicate with Google's Gemini AI service
- Code content is sent to Google AI only when you explicitly click "AI Review"
- Settings are used to customize the extension experience
- No analytics, tracking, or data collection is performed

## 3. Data Sharing & Liability

We do not sell, trade, or share your data with third parties, except:

- **Google Gemini AI:** Code content is sent to Google's API only when you request analysis
- **No Other Sharing:** No data is shared with any other services or companies

### ⚠️ Liability Limitations

**WE DISCLAIM ALL LIABILITY FOR:**

- ❌ Data breaches or unauthorized access to your code by Google or third parties
- ❌ Any damages arising from Google's processing, storage, or handling of your data
- ❌ Violations of privacy laws or regulations in your jurisdiction
- ❌ Business losses, consequential damages, or any indirect damages
- ❌ Actions taken by Google or other third parties with your data

**Maximum Liability:** Our total liability shall not exceed $1.00 (one US dollar).

## 4. Data Security

- All data is stored locally on your device using Chrome's secure storage API
- We have no access to your API keys or any stored data
- Communication with Google's API uses HTTPS encryption
- No data is transmitted to our servers
- **⚠️ Note:** Once data reaches Google, it's subject to Google's security practices, not ours

## 5. Third-Party Services

This extension uses Google's Gemini AI API. Please refer to [Google's Privacy Policy](https://policies.google.com/privacy) for information about how Google handles data sent to their API.

**Important:** Google's privacy policy and terms of service apply to all data sent to their API. We have no control over or responsibility for Google's data handling practices.

## 6. Data Retention

- API keys and settings are stored until you uninstall the extension
- Code content is not stored and is only temporarily processed during analysis
- You can clear all stored data by uninstalling the extension
- **⚠️ Google Retention:** We cannot control how long Google retains your data

## 7. Your Rights & Responsibilities

### Your Rights:

- You can remove your API key at any time through extension settings
- You can uninstall the extension to remove all stored data
- You control when code analysis is performed

### Your Responsibilities:

- **Ensure permission** to share code being analyzed
- **Verify no sensitive data** (passwords, API keys, secrets) is included
- **Comply with privacy laws** applicable in your jurisdiction
- **Check organization policies** before using on private/proprietary code
- **Accept full responsibility** for consequences of data sharing

## 8. User Consent & Acknowledgment

By using this extension, you explicitly acknowledge and agree that:

✅ You understand your code will be sent to Google's Gemini AI
✅ You have read and understand Google's privacy policy
✅ You have permission to share the code being analyzed
✅ You accept all risks associated with data transmission to third parties
✅ You will not hold us liable for any consequences arising from Google's data handling
✅ You are responsible for compliance with applicable laws and regulations

## 9. Technical Implementation Details

### Data Flow:

1. **Local Storage**: API key stored in Chrome storage (encrypted)
2. **User Action**: User clicks "AI Review" button
3. **Data Extraction**: Extension extracts only code diff from current page
4. **API Call**: Code sent directly to Google AI (no intermediary servers)
5. **Response**: AI suggestions displayed locally
6. **No Persistence**: No code content stored anywhere

### Code Analysis:

```javascript
// These data types are processed:
- File names from GitHub PR
- Code diff lines (additions/deletions)
- Line numbers for context
- No personal information
- No repository metadata
```

### Security Measures:

- **Local encryption** of API keys
- **HTTPS-only** communication
- **No server storage** of any data
- **No tracking scripts** or analytics
- **No third-party integrations** except Google AI

## 10. Changes to Privacy Policy

We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date.

## 11. Contact Information

If you have questions about this privacy policy or the extension, please contact:

- **Email:** devguide.vn@gmail.com
- **Website:** [DevGuide.vn](https://www.facebook.com/devguide.vn/)

---

## Extension Features

- 🤖 **AI-Powered Reviews**: Get intelligent code review suggestions using Google's Gemini AI
- 🔧 **Easy Configuration**: Simple setup through extension options page
- 💾 **Dual Storage**: Supports both Chrome sync storage and local storage as backup
- 🧪 **API Key Testing**: Built-in functionality to test your API key
- ✅ **Status Monitoring**: Clear indication of extension configuration status
- ⚠️ **Data Warning**: Clear warnings about data sharing with Google
- 🔒 **Privacy First**: No personal data collection or tracking

## Setup

### Getting a Google Gemini API Key

1. Visit the [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the generated API key (it should start with "AIza")

### Configuring the Extension

1. Click the extension icon in your Chrome toolbar
2. Click "Open Options" button
3. Paste your API key in the input field
4. Click "🧪 Test API Key" to verify it works
5. Click "Save Settings"

## Usage

1. Navigate to any GitHub pull request page
2. The extension will automatically detect the PR and add review functionality
3. **⚠️ Warning:** Before using AI review, ensure you have permission to share the code
4. Use the AI review features to get intelligent code analysis

## Privacy & Security Features

### Local Storage Only

- **Primary**: Chrome sync storage (syncs across devices)
- **Backup**: Local storage (device-specific fallback)
- **No Server Storage**: No data is sent to our servers

### API Key Protection

- Stored securely using Chrome's storage API
- Never transmitted to third parties (except Google's official API)
- Can be removed at any time through settings

### Data Minimization

- Only API key and settings are stored
- No personal information collected
- No code content stored permanently
- No tracking or analytics

### ⚠️ Data Sharing Warnings

- Clear warnings before sending data to Google
- User must explicitly consent to data sharing
- Reminders about Google's data handling policies

## Risk Assessment

### Low Risk:

✅ Analyzing non-sensitive code changes
✅ Personal projects with no confidential information

### High Risk:

❌ Private/proprietary company code
❌ Code containing secrets, API keys, or passwords
❌ Regulated industries (healthcare, finance, government)
❌ Code with personal data or sensitive information

### Recommendations:

- **Review code carefully** before analysis
- **Remove sensitive information** before using AI review
- **Check company policies** regarding code sharing
- **Use only on appropriate repositories**

## API Key Validation

The extension validates API keys with the following criteria:

- Must start with "AIza"
- Must be at least 30 characters long
- Must successfully authenticate with Google's Gemini API

## Status Indicators

- ✅ **Configured**: Extension is ready to use
- ❌ **Not Configured**: API key needs to be set up
- ⚠️ **Warning**: Data sharing warning active

## Error Handling

The extension includes comprehensive error handling for:

- Chrome storage failures (falls back to local storage)
- API key validation errors
- Network connectivity issues
- Invalid API responses
- Data sharing consent validation

## Troubleshooting

### Extension Not Working

1. Check that the API key is properly configured
2. Verify the API key is valid using the test function
3. Ensure you're on a GitHub pull request page
4. Check browser console for error messages

### API Key Issues

1. Verify the key starts with "AIza"
2. Ensure the key is at least 30 characters
3. Test the key using the built-in test function
4. Check that your Google Cloud project has the Gemini API enabled

### Storage Issues

1. Try clearing browser data and reconfiguring
2. Check if Chrome sync is enabled
3. Manually verify local storage contains the API key

### Privacy Concerns

1. Review this privacy policy for data handling practices
2. Understand that only Google receives code content for analysis
3. Check your organization's policies before using on private repositories
4. Contact us with any privacy-related questions
5. **Remember:** We are not responsible for Google's data handling

### Data Sharing Issues

1. Ensure you have permission to share the code
2. Remove any sensitive information before analysis
3. Understand Google's privacy policy applies to shared data
4. Accept responsibility for consequences of data sharing

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Create an issue in the project repository
4. Contact us via email for privacy concerns

**Note:** We cannot provide support for issues related to Google's handling of your data.

---

## Final Disclaimer

**⚠️ IMPORTANT:** This extension facilitates the transmission of code content to Google's Gemini AI service. Users are solely responsible for ensuring they have permission to share the code and that it complies with applicable privacy laws and organizational policies.

**THE EXTENSION DEVELOPERS ARE NOT LIABLE FOR ANY DATA BREACHES, UNAUTHORIZED ACCESS, OR LEGAL CONSEQUENCES ARISING FROM THE USE OF THIS SERVICE.**

**Note**: This extension requires a valid Google Gemini API key to function. API usage may be subject to Google's pricing and rate limits. We prioritize your privacy by storing all data locally and only sharing code content with Google's AI service when you explicitly request analysis.

## Transparency Report

### Open Source Commitment:

- ✅ **Full source code** available for inspection
- ✅ **No obfuscated code** or hidden functionality
- ✅ **Community auditable** for security and privacy
- ✅ **Regular updates** with clear changelog

### Privacy by Design:

- ✅ **Minimal data collection** by default
- ✅ **User control** over all data sharing
- ✅ **Local-first** storage approach
- ✅ **No tracking** or analytics

**Implemented by SonLV handsome** 🚀

---

**Contact Information:**

- 📧 **Email**: devguide.vn@gmail.com
- 🌐 **Website**: [DevGuide.vn](https://www.facebook.com/devguide.vn/)

```

```
