import '@servicenow/sdk/global'
import { DataPolicy } from '@servicenow/sdk/core'

// Server-side rules for AI providers, so a record that can't work is refused when saved instead of
// failing later. The form's UI policy still decides which fields show.
DataPolicy({
    $id: Now.ID['ai-provider-policy-api-key'],
    table: 'x_acllens_ai_provider',
    shortDescription: 'Require an API key for key-based AI providers',
    conditions: 'typeINanthropic,openai_compatible,azure_openai',
    rules: {
        api_key: { $id: Now.ID['ai-provider-policy-api-key-rule'], mandatory: true },
    },
})

DataPolicy({
    $id: Now.ID['ai-provider-policy-endpoint'],
    table: 'x_acllens_ai_provider',
    shortDescription: 'Require an endpoint for Azure and OpenAI-compatible providers',
    conditions: 'typeINopenai_compatible,azure_openai',
    rules: {
        endpoint: { $id: Now.ID['ai-provider-policy-endpoint-rule'], mandatory: true },
    },
})
