# Handsome Guy Code Review Extension

A Chrome extension that provides AI-powered code review assistance for GitHub pull requests using Google's Gemini API implement by SonLV handsome.

## Features

- 🤖 **AI-Powered Reviews**: Get intelligent code review suggestions using Google's Gemini AI
- 🔧 **Easy Configuration**: Simple setup through extension options page
- 💾 **Dual Storage**: Supports both Chrome sync storage and local storage as backup
- 🧪 **API Key Testing**: Built-in functionality to test your API key
- ✅ **Status Monitoring**: Clear indication of extension configuration status

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension will appear in your Chrome toolbar

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
3. Use the AI review features to get intelligent code analysis

## Configuration Storage

The extension uses a dual storage approach:

- **Primary**: Chrome sync storage (syncs across devices)
- **Backup**: Local storage (device-specific fallback)

This ensures your API key is preserved even if Chrome sync is unavailable.

## API Key Validation

The extension validates API keys with the following criteria:

- Must start with "AIza"
- Must be at least 30 characters long
- Must successfully authenticate with Google's Gemini API

## Status Indicators

- ✅ **Configured**: Extension is ready to use
- ❌ **Not Configured**: API key needs to be set up

## Error Handling

The extension includes comprehensive error handling for:

- Chrome storage failures (falls back to local storage)
- API key validation errors
- Network connectivity issues
- Invalid API responses

## Development

### Prerequisites

- Chrome browser
- Basic knowledge of JavaScript and Chrome extension development

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Debugging

- Use Chrome DevTools for popup and options pages
- Check the Console tab for error messages
- Use `chrome://extensions/` to view extension errors

## Security

- API keys are stored securely using Chrome's storage API
- No sensitive data is transmitted to external servers (except Google's official Gemini API)
- All API calls use HTTPS encryption

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Please check the repository for license details.

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Create an issue in the project repository

---

**Note**: This extension requires a valid Google Gemini API key to function. API usage may be subject to Google's pricing and rate limits.
