const axios = require('axios')

async function checkModeration(apiKey, text) {
  const endpoint = 'https://api.openai.com/v1/moderations'
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
  const data = { input: text }
  const response = await axios.post(endpoint, data, { headers })
  const results = response.data.results[0]
  console.log(results)
  return results
}

module.exports = { checkModeration }
