const axios = require("axios")

async function testRoutes() {
  const routes = ["/", "/artists", "/shows", "/trending", "/api/health"]

  for (const route of routes) {
    try {
      const response = await axios.get(`http://localhost:3001${route}`, {
        timeout: 5000,
        validateStatus: () => true, // Don't throw on non-2xx
      })

      if (response.status === 500 && response.data) {
      }
    } catch (_error) {}
  }
}

testRoutes()
