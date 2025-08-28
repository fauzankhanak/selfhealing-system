const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateTroubleshootingResponse = async (userQuery, confluenceResults, jiraResults) => {
  try {
    // Prepare context from Confluence and Jira
    const confluenceContext = confluenceResults.length > 0 
      ? `\n\nRelevant Documentation:\n${confluenceResults.map(r => `- ${r.title}: ${r.content.substring(0, 200)}...`).join('\n')}`
      : '';
    
    const jiraContext = jiraResults.length > 0
      ? `\n\nRelated Issues:\n${jiraResults.map(r => `- ${r.issue_key}: ${r.summary} (Status: ${r.status})`).join('\n')}`
      : '';
    
    const systemPrompt = `You are an expert IT troubleshooting assistant. Your role is to help users resolve technical issues by providing clear, actionable solutions based on available documentation and past issues.

Guidelines:
1. Always provide step-by-step solutions when possible
2. Reference relevant documentation and past issues when available
3. If you're not confident about a solution, acknowledge the uncertainty
4. Suggest escalation paths when appropriate
5. Keep responses concise but comprehensive
6. Use a helpful, professional tone

Available context:${confluenceContext}${jiraContext}`;

    const userPrompt = `User Issue: ${userQuery}

Please provide a troubleshooting solution based on the available documentation and past issues. If you reference specific documentation or issues, please mention them clearly.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const response = completion.choices[0].message.content;
    
    // Calculate confidence score based on available context
    let confidence = 0.5; // Base confidence
    
    if (confluenceResults.length > 0) {
      confidence += 0.2;
    }
    
    if (jiraResults.length > 0) {
      confidence += 0.2;
    }
    
    // Check if response contains actionable steps
    if (response.toLowerCase().includes('step') || response.includes('1.') || response.includes('•')) {
      confidence += 0.1;
    }
    
    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);

    return {
      response,
      confidence,
      sources: {
        confluence: confluenceResults.length,
        jira: jiraResults.length
      }
    };

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback response
    return {
      response: `I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact your IT support team directly for immediate assistance.

Your issue: ${userQuery}`,
      confidence: 0.1,
      sources: {
        confluence: 0,
        jira: 0
      }
    };
  }
};

const analyzeIssueComplexity = async (userQuery) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Analyze the technical complexity of the user's issue. Return a JSON object with 'complexity' (low/medium/high) and 'estimated_resolution_time' (in minutes)."
        },
        {
          role: "user",
          content: userQuery
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    return analysis;
  } catch (error) {
    console.error('Issue analysis error:', error);
    return {
      complexity: 'medium',
      estimated_resolution_time: 30
    };
  }
};

module.exports = {
  generateTroubleshootingResponse,
  analyzeIssueComplexity
};