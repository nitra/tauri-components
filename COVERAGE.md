# Coverage

| Область | Рядки | Функції | Вбито мутацій | Score |
| --- | --- | --- | --- | --- |
| JS | 70.46% (198/281) | 64.86% (48/74) | 348/1183 | 29.42% |
| Vue (Storybook) | 47.90% (57/119) | 39.53% (17/43) | 0/0 | — |
| **Разом** | 63.75% (255/400) | 55.56% (65/117) | 348/1183 | 29.42% |

## Вцілілі мутанти

```json
[
  {
    "file": "npm/src/core/acp-kit.js",
    "mutants": [
      {
        "line": 24,
        "col": 42,
        "mutantType": "StringLiteral",
        "original": "acp' ",
        "replacement": "\"\""
      },
      {
        "line": 25,
        "col": 21,
        "mutantType": "Regex",
        "original": "\\?\\s*$/",
        "replacement": "/\\?\\s*/"
      },
      {
        "line": 25,
        "col": 21,
        "mutantType": "Regex",
        "original": "\\?\\s*$/",
        "replacement": "/\\?\\S*$/"
      },
      {
        "line": 32,
        "col": 10,
        "mutantType": "ConditionalExpression",
        "original": "ypeof text === 'string' ",
        "replacement": "true"
      },
      {
        "line": 32,
        "col": 55,
        "mutantType": "MethodExpression",
        "original": "ext.trim())",
        "replacement": "text"
      },
      {
        "line": 43,
        "col": 39,
        "mutantType": "ConditionalExpression",
        "original": "urn.stopped === 'refusal')",
        "replacement": "false"
      },
      {
        "line": 43,
        "col": 56,
        "mutantType": "StringLiteral",
        "original": "refusal')",
        "replacement": "\"\""
      },
      {
        "line": 44,
        "col": 12,
        "mutantType": "ConditionalExpression",
        "original": "urn.stopped === 'cancelled')",
        "replacement": "false"
      },
      {
        "line": 44,
        "col": 29,
        "mutantType": "StringLiteral",
        "original": "cancelled')",
        "replacement": "\"\""
      },
      {
        "line": 73,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "dispatch)",
        "replacement": "false"
      },
      {
        "line": 83,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "ctiveRequestId)",
        "replacement": "true"
      },
      {
        "line": 99,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "activeRequestId)",
        "replacement": "false"
      },
      {
        "line": 109,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "istening)",
        "replacement": "false"
      },
      {
        "line": 110,
        "col": 17,
        "mutantType": "BooleanLiteral",
        "original": "rue",
        "replacement": "false"
      },
      {
        "line": 136,
        "col": 21,
        "mutantType": "ArrayDeclaration",
        "original": "...baseActions, ...turn.trace]",
        "replacement": "[]"
      },
      {
        "line": 137,
        "col": 37,
        "mutantType": "ObjectLiteral",
        "original": " ...fields, messages: turn.messages, actions, pendingApproval: null })",
        "replacement": "{}"
      },
      {
        "line": 150,
        "col": 39,
        "mutantType": "ObjectLiteral",
        "original": " intent, actor: AGENT_ACTOR })",
        "replacement": "{}"
      },
      {
        "line": 151,
        "col": 32,
        "mutantType": "ObjectLiteral",
        "original": " status: 'running' })",
        "replacement": "{}"
      },
      {
        "line": 151,
        "col": 42,
        "mutantType": "StringLiteral",
        "original": "running' ",
        "replacement": "\"\""
      },
      {
        "line": 155,
        "col": 32,
        "mutantType": "ObjectLiteral",
        "original": " acp: { agentKind: session.agentKind, sessionKey: session.sessionKey } })",
        "replacement": "{}"
      },
      {
        "line": 155,
        "col": 39,
        "mutantType": "ObjectLiteral",
        "original": " agentKind: session.agentKind, sessionKey: session.sessionKey } ",
        "replacement": "{}"
      },
      {
        "line": 156,
        "col": 32,
        "mutantType": "ArrayDeclaration",
        "original": "],",
        "replacement": "[\"Stryker was here\"]"
      },
      {
        "line": 156,
        "col": 52,
        "mutantType": "ObjectLiteral",
        "original": " sessionKey: activeSessionKey, text: intent })",
        "replacement": "{}"
      },
      {
        "line": 196,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "ecord.status !== 'needs_approval' || !pending)",
        "replacement": "false"
      },
      {
        "line": 196,
        "col": 11,
        "mutantType": "LogicalOperator",
        "original": "ecord.status !== 'needs_approval' || !pending)",
        "replacement": "record.status !== 'needs_approval' && !pending"
      },
      {
        "line": 196,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "ecord.status !== 'needs_approval' ",
        "replacement": "false"
      },
      {
        "line": 233,
        "col": 19,
        "mutantType": "ArrayDeclaration",
        "original": "...(record.actions ?? []), { tool: pending.tool, input: pending.input, envelope }]",
        "replacement": "[]"
      },
      {
        "line": 233,
        "col": 24,
        "mutantType": "LogicalOperator",
        "original": "ecord.actions ?? [])",
        "replacement": "record.actions && []"
      },
      {
        "line": 233,
        "col": 47,
        "mutantType": "ObjectLiteral",
        "original": " tool: pending.tool, input: pending.input, envelope }]",
        "replacement": "{}"
      },
      {
        "line": 234,
        "col": 35,
        "mutantType": "ObjectLiteral",
        "original": " status: 'running', actions, pendingApproval: null })",
        "replacement": "{}"
      },
      {
        "line": 234,
        "col": 45,
        "mutantType": "StringLiteral",
        "original": "running',",
        "replacement": "\"\""
      },
      {
        "line": 254,
        "col": 33,
        "mutantType": "StringLiteral",
        "original": "allow' ",
        "replacement": "\"\""
      },
      {
        "line": 255,
        "col": 18,
        "mutantType": "OptionalChaining",
        "original": "ending.options?.find(",
        "replacement": "pending.options.find"
      },
      {
        "line": 255,
        "col": 45,
        "mutantType": "OptionalChaining",
        "original": ".kind?.startsWith(",
        "replacement": "o.kind.startsWith"
      },
      {
        "line": 256,
        "col": 54,
        "mutantType": "OptionalChaining",
        "original": "ption?.optionId)",
        "replacement": "option.optionId"
      },
      {
        "line": 258,
        "col": 35,
        "mutantType": "ObjectLiteral",
        "original": " status: 'running', pendingApproval: null })",
        "replacement": "{}"
      },
      {
        "line": 258,
        "col": 45,
        "mutantType": "StringLiteral",
        "original": "running',",
        "replacement": "\"\""
      },
      {
        "line": 259,
        "col": 66,
        "mutantType": "LogicalOperator",
        "original": "ecord.actions ?? [],",
        "replacement": "record.actions && []"
      }
    ],
    "exampleTest": {
      "testFile": "npm/src/core/acp-kit.test.js",
      "code": "  it('throws without a catalog', () => {\n    expect(() => createAcpAgentKit({})).toThrow(/catalog/)\n  })"
    },
    "recommendationText": null
  },
  {
    "file": "npm/src/core/agent-handler.js",
    "mutants": [
      {
        "line": 16,
        "col": 21,
        "mutantType": "Regex",
        "original": "\\?\\s*$/",
        "replacement": "/\\?\\s*/"
      },
      {
        "line": 16,
        "col": 21,
        "mutantType": "Regex",
        "original": "\\?\\s*$/",
        "replacement": "/\\?\\s$/"
      },
      {
        "line": 16,
        "col": 21,
        "mutantType": "Regex",
        "original": "\\?\\s*$/",
        "replacement": "/\\?\\S*$/"
      },
      {
        "line": 22,
        "col": 27,
        "mutantType": "BlockStatement",
        "original": "\n  return typeof text === 'string' && QUESTION_RE.test(text.trim())\n}",
        "replacement": "{}"
      },
      {
        "line": 23,
        "col": 10,
        "mutantType": "ConditionalExpression",
        "original": "ypeof text === 'string' && QUESTION_RE.test(text.trim())",
        "replacement": "false"
      },
      {
        "line": 23,
        "col": 10,
        "mutantType": "ConditionalExpression",
        "original": "ypeof text === 'string' ",
        "replacement": "true"
      },
      {
        "line": 23,
        "col": 10,
        "mutantType": "EqualityOperator",
        "original": "ypeof text === 'string' ",
        "replacement": "typeof text !== 'string'"
      },
      {
        "line": 23,
        "col": 26,
        "mutantType": "StringLiteral",
        "original": "string' ",
        "replacement": "\"\""
      },
      {
        "line": 23,
        "col": 55,
        "mutantType": "MethodExpression",
        "original": "ext.trim())",
        "replacement": "text"
      },
      {
        "line": 35,
        "col": 12,
        "mutantType": "ConditionalExpression",
        "original": "esult.stopped === 'max_steps')",
        "replacement": "false"
      },
      {
        "line": 35,
        "col": 31,
        "mutantType": "StringLiteral",
        "original": "max_steps')",
        "replacement": "\"\""
      },
      {
        "line": 36,
        "col": 12,
        "mutantType": "ConditionalExpression",
        "original": "uestion)",
        "replacement": "false"
      },
      {
        "line": 75,
        "col": 20,
        "mutantType": "LogicalOperator",
        "original": "rounding.fallback ?? []",
        "replacement": "grounding.fallback && []"
      },
      {
        "line": 75,
        "col": 42,
        "mutantType": "ArrayDeclaration",
        "original": "]",
        "replacement": "[\"Stryker was here\"]"
      },
      {
        "line": 78,
        "col": 21,
        "mutantType": "OptionalChaining",
        "original": "es?.ok ",
        "replacement": "res.ok"
      },
      {
        "line": 91,
        "col": 35,
        "mutantType": "ObjectLiteral",
        "original": " intent, actor })",
        "replacement": "{}"
      },
      {
        "line": 92,
        "col": 28,
        "mutantType": "ObjectLiteral",
        "original": " status: 'running' })",
        "replacement": "{}"
      },
      {
        "line": 92,
        "col": 38,
        "mutantType": "StringLiteral",
        "original": "running' ",
        "replacement": "\"\""
      },
      {
        "line": 145,
        "col": 7,
        "mutantType": "ConditionalExpression",
        "original": "ecord.status !== 'needs_approval' || !record.pendingApproval)",
        "replacement": "false"
      },
      {
        "line": 145,
        "col": 7,
        "mutantType": "LogicalOperator",
        "original": "ecord.status !== 'needs_approval' || !record.pendingApproval)",
        "replacement": "record.status !== 'needs_approval' && !record.pendingApproval"
      },
      {
        "line": 145,
        "col": 7,
        "mutantType": "ConditionalExpression",
        "original": "ecord.status !== 'needs_approval' ",
        "replacement": "false"
      },
      {
        "line": 150,
        "col": 51,
        "mutantType": "StringLiteral",
        "original": "Rejected by human.',",
        "replacement": "\"\""
      },
      {
        "line": 152,
        "col": 45,
        "mutantType": "LogicalOperator",
        "original": "ecord.actions ?? [],",
        "replacement": "record.actions && []"
      },
      {
        "line": 156,
        "col": 35,
        "mutantType": "ObjectLiteral",
        "original": " status: 'running' })",
        "replacement": "{}"
      },
      {
        "line": 156,
        "col": 45,
        "mutantType": "StringLiteral",
        "original": "running' ",
        "replacement": "\"\""
      },
      {
        "line": 158,
        "col": 19,
        "mutantType": "ArrayDeclaration",
        "original": "...(record.actions ?? []), { tool, input, envelope }]",
        "replacement": "[]"
      },
      {
        "line": 158,
        "col": 24,
        "mutantType": "LogicalOperator",
        "original": "ecord.actions ?? [])",
        "replacement": "record.actions && []"
      },
      {
        "line": 158,
        "col": 47,
        "mutantType": "ObjectLiteral",
        "original": " tool, input, envelope }]",
        "replacement": "{}"
      },
      {
        "line": 160,
        "col": 7,
        "mutantType": "ConditionalExpression",
        "original": "envelope.ok)",
        "replacement": "false"
      },
      {
        "line": 168,
        "col": 19,
        "mutantType": "StringLiteral",
        "original": "Approved: ${tool} executed.`",
        "replacement": "``"
      },
      {
        "line": 169,
        "col": 35,
        "mutantType": "ObjectLiteral",
        "original": " status: 'done', actions, summary, error: null, pendingApproval: null })",
        "replacement": "{}"
      },
      {
        "line": 169,
        "col": 45,
        "mutantType": "StringLiteral",
        "original": "done',",
        "replacement": "\"\""
      }
    ],
    "exampleTest": null,
    "recommendationText": null
  },
  {
    "file": "npm/src/core/agent-kit.js",
    "mutants": [
      {
        "line": 23,
        "col": 58,
        "mutantType": "StringLiteral",
        "original": "',",
        "replacement": "\"Stryker was here!\""
      },
      {
        "line": 27,
        "col": 75,
        "mutantType": "ArrowFunction",
        "original": ") => systemPrompt",
        "replacement": "() => undefined"
      },
      {
        "line": 28,
        "col": 20,
        "mutantType": "ArrowFunction",
        "original": "ctor => scopedManifest(catalog, actorTiers, actor)",
        "replacement": "() => undefined"
      },
      {
        "line": 33,
        "col": 15,
        "mutantType": "ArrowFunction",
        "original": "actor, name) => classify(catalog, actorTiers, actor, name),",
        "replacement": "() => undefined"
      },
      {
        "line": 34,
        "col": 21,
        "mutantType": "ArrowFunction",
        "original": "ctor => toolsFor(actor),",
        "replacement": "() => undefined"
      },
      {
        "line": 35,
        "col": 19,
        "mutantType": "ArrowFunction",
        "original": "llow => toolManifest(catalog, allow),",
        "replacement": "() => undefined"
      },
      {
        "line": 38,
        "col": 14,
        "mutantType": "ArrowFunction",
        "original": "{ requestId, message, actor, chat }) =>\n      handleRespond({ requestId, message, actor, chat, dispatch, journal, tools: toolsFor(actor), gate: gateFor(actor) }),",
        "replacement": "() => undefined"
      }
    ],
    "exampleTest": {
      "testFile": "npm/src/core/agent-kit.test.js",
      "code": "  it('throws without a catalog', () => {\n    expect(() => createAgentKit({})).toThrow(/catalog/)\n  })"
    },
    "recommendationText": null
  },
  {
    "file": "npm/src/core/dispatch.js",
    "mutants": [
      {
        "line": 18,
        "col": 32,
        "mutantType": "ConditionalExpression",
        "original": "alue === null)",
        "replacement": "false"
      },
      {
        "line": 19,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "pec.required)",
        "replacement": "true"
      },
      {
        "line": 22,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "pec.type === 'string' ",
        "replacement": "true"
      },
      {
        "line": 23,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "pec.type === 'object' && (typeof value !== 'object' || Array.isArray(value)))",
        "replacement": "false"
      },
      {
        "line": 23,
        "col": 23,
        "mutantType": "StringLiteral",
        "original": "object' ",
        "replacement": "\"\""
      },
      {
        "line": 37,
        "col": 29,
        "mutantType": "BooleanLiteral",
        "original": "alse,",
        "replacement": "true"
      },
      {
        "line": 37,
        "col": 73,
        "mutantType": "StringLiteral",
        "original": "Unknown tool: ${name}` ",
        "replacement": "``"
      },
      {
        "line": 47,
        "col": 54,
        "mutantType": "OptionalChaining",
        "original": "rror?.message ",
        "replacement": "error.message"
      },
      {
        "line": 50,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "rror?.kind !== undefined)",
        "replacement": "true"
      },
      {
        "line": 50,
        "col": 11,
        "mutantType": "OptionalChaining",
        "original": "rror?.kind ",
        "replacement": "error.kind"
      }
    ],
    "exampleTest": {
      "testFile": "npm/src/core/dispatch.test.js",
      "code": "  it('returns an ok envelope from the transport output', async () => {\n    const dispatch = createDispatch(catalog, () => 'pong')\n    expect(await dispatch('ping', {})).toEqual({ ok: true, output: 'pong' })\n  })"
    },
    "recommendationText": null
  },
  {
    "file": "npm/src/core/llm.js",
    "mutants": [
      {
        "line": 5,
        "col": 24,
        "mutantType": "StringLiteral",
        "original": "You are a tool-using assistant. Call one tool at a time and wait for its result. If the request is ambiguous, ask a clarifying question with no tool call. When done, reply with a plain-text summary and no tool call.'",
        "replacement": "\"\""
      },
      {
        "line": 26,
        "col": 9,
        "mutantType": "ObjectLiteral",
        "original": " role: 'user', content: prompt },",
        "replacement": "{}"
      },
      {
        "line": 26,
        "col": 17,
        "mutantType": "StringLiteral",
        "original": "user',",
        "replacement": "\"\""
      },
      {
        "line": 30,
        "col": 22,
        "mutantType": "EqualityOperator",
        "original": "tep < maxSteps;",
        "replacement": "step <= maxSteps"
      },
      {
        "line": 30,
        "col": 39,
        "mutantType": "UpdateOperator",
        "original": "tep++)",
        "replacement": "step--"
      },
      {
        "line": 36,
        "col": 53,
        "mutantType": "ArithmeticOperator",
        "original": "tep + 1,",
        "replacement": "step - 1"
      },
      {
        "line": 51,
        "col": 27,
        "mutantType": "LogicalOperator",
        "original": "eply.content ?? '',",
        "replacement": "reply.content && ''"
      },
      {
        "line": 51,
        "col": 55,
        "mutantType": "ArithmeticOperator",
        "original": "tep + 1,",
        "replacement": "step - 1"
      },
      {
        "line": 54,
        "col": 24,
        "mutantType": "ConditionalExpression",
        "original": "ecision === 'deny'",
        "replacement": "false"
      },
      {
        "line": 54,
        "col": 37,
        "mutantType": "StringLiteral",
        "original": "deny'",
        "replacement": "\"\""
      },
      {
        "line": 58,
        "col": 21,
        "mutantType": "ObjectLiteral",
        "original": " role: 'tool', tool_call_id: call.id, content: JSON.stringify(envelope) })",
        "replacement": "{}"
      },
      {
        "line": 58,
        "col": 29,
        "mutantType": "StringLiteral",
        "original": "tool',",
        "replacement": "\"\""
      }
    ],
    "exampleTest": null,
    "recommendationText": null
  },
  {
    "file": "npm/src/core/manifest.js",
    "mutants": [
      {
        "line": 10,
        "col": 37,
        "mutantType": "BlockStatement",
        "original": "\n  const properties = {}\n  const required = []\n  for (const [key, spec] of Object.entries(input)) {\n    properties[key] = spec.description ? { type: spec.type, description: spec.description } : { type: spec.type }\n    if (spec.required) required.push(key)\n  }\n  return required.length ? { type: 'object', properties, required } : { type: 'object', properties }\n}",
        "replacement": "{}"
      },
      {
        "line": 12,
        "col": 20,
        "mutantType": "ArrayDeclaration",
        "original": "]",
        "replacement": "[\"Stryker was here\"]"
      },
      {
        "line": 13,
        "col": 52,
        "mutantType": "BlockStatement",
        "original": "\n    properties[key] = spec.description ? { type: spec.type, description: spec.description } : { type: spec.type }\n    if (spec.required) required.push(key)\n  }",
        "replacement": "{}"
      },
      {
        "line": 14,
        "col": 95,
        "mutantType": "ObjectLiteral",
        "original": " type: spec.type }",
        "replacement": "{}"
      },
      {
        "line": 15,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "pec.required)",
        "replacement": "true"
      },
      {
        "line": 15,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "pec.required)",
        "replacement": "false"
      },
      {
        "line": 17,
        "col": 28,
        "mutantType": "ObjectLiteral",
        "original": " type: 'object', properties, required } ",
        "replacement": "{}"
      },
      {
        "line": 17,
        "col": 36,
        "mutantType": "StringLiteral",
        "original": "object',",
        "replacement": "\"\""
      },
      {
        "line": 17,
        "col": 71,
        "mutantType": "ObjectLiteral",
        "original": " type: 'object', properties }",
        "replacement": "{}"
      },
      {
        "line": 17,
        "col": 79,
        "mutantType": "StringLiteral",
        "original": "object',",
        "replacement": "\"\""
      },
      {
        "line": 27,
        "col": 10,
        "mutantType": "MethodExpression",
        "original": "atalog.filter(tool => allow(tool)).",
        "replacement": "catalog"
      },
      {
        "line": 28,
        "col": 11,
        "mutantType": "StringLiteral",
        "original": "function',",
        "replacement": "\"\""
      }
    ],
    "exampleTest": null,
    "recommendationText": null
  },
  {
    "file": "npm/src/core/omlx-models.js",
    "mutants": [
      {
        "line": 16,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "response.ok)",
        "replacement": "false"
      },
      {
        "line": 18,
        "col": 26,
        "mutantType": "OptionalChaining",
        "original": "ata?.data)",
        "replacement": "data.data"
      },
      {
        "line": 18,
        "col": 59,
        "mutantType": "OptionalChaining",
        "original": "?.id)",
        "replacement": "m.id"
      }
    ],
    "exampleTest": {
      "testFile": "npm/src/core/omlx-models.test.js",
      "code": "  it('returns [] without a baseUrl (no fetch)', async () => {\n    const fetchFn = vi.fn()\n    expect(await listOmlxModels({ fetchFn })).toEqual([])\n    expect(fetchFn).not.toHaveBeenCalled()\n  })"
    },
    "recommendationText": null
  },
  {
    "file": "npm/src/core/resolve-omlx-base-url.js",
    "mutants": [
      {
        "line": 11,
        "col": 37,
        "mutantType": "StringLiteral",
        "original": "http://127.0.0.1:8000/v1'",
        "replacement": "\"\""
      },
      {
        "line": 50,
        "col": 20,
        "mutantType": "ConditionalExpression",
        "original": "ypeof AbortSignal?.timeout === 'function' ",
        "replacement": "true"
      },
      {
        "line": 50,
        "col": 27,
        "mutantType": "OptionalChaining",
        "original": "bortSignal?.timeout ",
        "replacement": "AbortSignal.timeout"
      },
      {
        "line": 73,
        "col": 20,
        "mutantType": "LogicalOperator",
        "original": "robeOptions.proxyUrl ?? PROXY_OMLX_BASE_URL",
        "replacement": "probeOptions.proxyUrl && PROXY_OMLX_BASE_URL"
      },
      {
        "line": 75,
        "col": 17,
        "mutantType": "EqualityOperator",
        "original": "ow() < cached.expiresAt)",
        "replacement": "now() <= cached.expiresAt"
      }
    ],
    "exampleTest": {
      "testFile": "npm/src/core/resolve-omlx-base-url.test.js",
      "code": "  it('accepts the default local omlx hosts', () => {\n    expect(isDirectOmlxUrl('http://127.0.0.1:8000/v1')).toBe(true)\n    expect(isDirectOmlxUrl('http://localhost:8000/v1')).toBe(true)\n  })"
    },
    "recommendationText": null
  },
  {
    "file": "npm/src/core/scope.js",
    "mutants": [
      {
        "line": 26,
        "col": 21,
        "mutantType": "OptionalChaining",
        "original": "ctor?.kind]",
        "replacement": "actor.kind"
      },
      {
        "line": 28,
        "col": 38,
        "mutantType": "OptionalChaining",
        "original": "ctor?.kind ",
        "replacement": "actor.kind"
      },
      {
        "line": 40,
        "col": 40,
        "mutantType": "ConditionalExpression",
        "original": "lassify(catalog, actorTiers, actor, tool.name) !== 'deny')",
        "replacement": "true"
      },
      {
        "line": 40,
        "col": 92,
        "mutantType": "StringLiteral",
        "original": "deny')",
        "replacement": "\"\""
      }
    ],
    "exampleTest": {
      "testFile": "npm/src/core/scope.test.js",
      "code": "  it('lets a human run every tier directly', () => {\n    expect(classify(catalog, undefined, human, 'scan')).toBe('allow')\n    expect(classify(catalog, undefined, human, 'create')).toBe('allow')\n    expect(classify(catalog, undefined, human, 'remove')).toBe('allow')\n  })"
    },
    "recommendationText": null
  }
]
```

### npm/src/core/acp-kit.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 24 | `acp' ` | `""` | StringLiteral |
| 25 | `\?\s*$/` | `/\?\s*/` | Regex |
| 25 | `\?\s*$/` | `/\?\S*$/` | Regex |
| 32 | `ypeof text === 'string' ` | `true` | ConditionalExpression |
| 32 | `ext.trim())` | `text` | MethodExpression |
| 43 | `urn.stopped === 'refusal')` | `false` | ConditionalExpression |
| 43 | `refusal')` | `""` | StringLiteral |
| 44 | `urn.stopped === 'cancelled')` | `false` | ConditionalExpression |
| 44 | `cancelled')` | `""` | StringLiteral |
| 73 | `dispatch)` | `false` | ConditionalExpression |
| 83 | `ctiveRequestId)` | `true` | ConditionalExpression |
| 99 | `activeRequestId)` | `false` | ConditionalExpression |
| 109 | `istening)` | `false` | ConditionalExpression |
| 110 | `rue` | `false` | BooleanLiteral |
| 136 | `...baseActions, ...turn.trace]` | `[]` | ArrayDeclaration |
| 137 | ` ...fields, messages: turn.messages, actions, pendingApproval: null })` | `{}` | ObjectLiteral |
| 150 | ` intent, actor: AGENT_ACTOR })` | `{}` | ObjectLiteral |
| 151 | ` status: 'running' })` | `{}` | ObjectLiteral |
| 151 | `running' ` | `""` | StringLiteral |
| 155 | ` acp: { agentKind: session.agentKind, sessionKey: session.sessionKey } })` | `{}` | ObjectLiteral |
| 155 | ` agentKind: session.agentKind, sessionKey: session.sessionKey } ` | `{}` | ObjectLiteral |
| 156 | `],` | `["Stryker was here"]` | ArrayDeclaration |
| 156 | ` sessionKey: activeSessionKey, text: intent })` | `{}` | ObjectLiteral |
| 196 | `ecord.status !== 'needs_approval' || !pending)` | `false` | ConditionalExpression |
| 196 | `ecord.status !== 'needs_approval' || !pending)` | `record.status !== 'needs_approval' && !pending` | LogicalOperator |
| 196 | `ecord.status !== 'needs_approval' ` | `false` | ConditionalExpression |
| 233 | `...(record.actions ?? []), { tool: pending.tool, input: pending.input, envelope }]` | `[]` | ArrayDeclaration |
| 233 | `ecord.actions ?? [])` | `record.actions && []` | LogicalOperator |
| 233 | ` tool: pending.tool, input: pending.input, envelope }]` | `{}` | ObjectLiteral |
| 234 | ` status: 'running', actions, pendingApproval: null })` | `{}` | ObjectLiteral |
| 234 | `running',` | `""` | StringLiteral |
| 254 | `allow' ` | `""` | StringLiteral |
| 255 | `ending.options?.find(` | `pending.options.find` | OptionalChaining |
| 255 | `.kind?.startsWith(` | `o.kind.startsWith` | OptionalChaining |
| 256 | `ption?.optionId)` | `option.optionId` | OptionalChaining |
| 258 | ` status: 'running', pendingApproval: null })` | `{}` | ObjectLiteral |
| 258 | `running',` | `""` | StringLiteral |
| 259 | `ecord.actions ?? [],` | `record.actions && []` | LogicalOperator |

**Приклад тесту** (`npm/src/core/acp-kit.test.js`):

```js
  it('throws without a catalog', () => {
    expect(() => createAcpAgentKit({})).toThrow(/catalog/)
  })
```

### npm/src/core/agent-handler.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 16 | `\?\s*$/` | `/\?\s*/` | Regex |
| 16 | `\?\s*$/` | `/\?\s$/` | Regex |
| 16 | `\?\s*$/` | `/\?\S*$/` | Regex |
| 22 | `
  return typeof text === 'string' && QUESTION_RE.test(text.trim())
}` | `{}` | BlockStatement |
| 23 | `ypeof text === 'string' && QUESTION_RE.test(text.trim())` | `false` | ConditionalExpression |
| 23 | `ypeof text === 'string' ` | `true` | ConditionalExpression |
| 23 | `ypeof text === 'string' ` | `typeof text !== 'string'` | EqualityOperator |
| 23 | `string' ` | `""` | StringLiteral |
| 23 | `ext.trim())` | `text` | MethodExpression |
| 35 | `esult.stopped === 'max_steps')` | `false` | ConditionalExpression |
| 35 | `max_steps')` | `""` | StringLiteral |
| 36 | `uestion)` | `false` | ConditionalExpression |
| 75 | `rounding.fallback ?? []` | `grounding.fallback && []` | LogicalOperator |
| 75 | `]` | `["Stryker was here"]` | ArrayDeclaration |
| 78 | `es?.ok ` | `res.ok` | OptionalChaining |
| 91 | ` intent, actor })` | `{}` | ObjectLiteral |
| 92 | ` status: 'running' })` | `{}` | ObjectLiteral |
| 92 | `running' ` | `""` | StringLiteral |
| 145 | `ecord.status !== 'needs_approval' || !record.pendingApproval)` | `false` | ConditionalExpression |
| 145 | `ecord.status !== 'needs_approval' || !record.pendingApproval)` | `record.status !== 'needs_approval' && !record.pendingApproval` | LogicalOperator |
| 145 | `ecord.status !== 'needs_approval' ` | `false` | ConditionalExpression |
| 150 | `Rejected by human.',` | `""` | StringLiteral |
| 152 | `ecord.actions ?? [],` | `record.actions && []` | LogicalOperator |
| 156 | ` status: 'running' })` | `{}` | ObjectLiteral |
| 156 | `running' ` | `""` | StringLiteral |
| 158 | `...(record.actions ?? []), { tool, input, envelope }]` | `[]` | ArrayDeclaration |
| 158 | `ecord.actions ?? [])` | `record.actions && []` | LogicalOperator |
| 158 | ` tool, input, envelope }]` | `{}` | ObjectLiteral |
| 160 | `envelope.ok)` | `false` | ConditionalExpression |
| 168 | `Approved: ${tool} executed.`` | ```` | StringLiteral |
| 169 | ` status: 'done', actions, summary, error: null, pendingApproval: null })` | `{}` | ObjectLiteral |
| 169 | `done',` | `""` | StringLiteral |

### npm/src/core/agent-kit.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 23 | `',` | `"Stryker was here!"` | StringLiteral |
| 27 | `) => systemPrompt` | `() => undefined` | ArrowFunction |
| 28 | `ctor => scopedManifest(catalog, actorTiers, actor)` | `() => undefined` | ArrowFunction |
| 33 | `actor, name) => classify(catalog, actorTiers, actor, name),` | `() => undefined` | ArrowFunction |
| 34 | `ctor => toolsFor(actor),` | `() => undefined` | ArrowFunction |
| 35 | `llow => toolManifest(catalog, allow),` | `() => undefined` | ArrowFunction |
| 38 | `{ requestId, message, actor, chat }) =>
      handleRespond({ requestId, message, actor, chat, dispatch, journal, tools: toolsFor(actor), gate: gateFor(actor) }),` | `() => undefined` | ArrowFunction |

**Приклад тесту** (`npm/src/core/agent-kit.test.js`):

```js
  it('throws without a catalog', () => {
    expect(() => createAgentKit({})).toThrow(/catalog/)
  })
```

### npm/src/core/dispatch.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 18 | `alue === null)` | `false` | ConditionalExpression |
| 19 | `pec.required)` | `true` | ConditionalExpression |
| 22 | `pec.type === 'string' ` | `true` | ConditionalExpression |
| 23 | `pec.type === 'object' && (typeof value !== 'object' || Array.isArray(value)))` | `false` | ConditionalExpression |
| 23 | `object' ` | `""` | StringLiteral |
| 37 | `alse,` | `true` | BooleanLiteral |
| 37 | `Unknown tool: ${name}` ` | ```` | StringLiteral |
| 47 | `rror?.message ` | `error.message` | OptionalChaining |
| 50 | `rror?.kind !== undefined)` | `true` | ConditionalExpression |
| 50 | `rror?.kind ` | `error.kind` | OptionalChaining |

**Приклад тесту** (`npm/src/core/dispatch.test.js`):

```js
  it('returns an ok envelope from the transport output', async () => {
    const dispatch = createDispatch(catalog, () => 'pong')
    expect(await dispatch('ping', {})).toEqual({ ok: true, output: 'pong' })
  })
```

### npm/src/core/llm.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 5 | `You are a tool-using assistant. Call one tool at a time and wait for its result. If the request is ambiguous, ask a clarifying question with no tool call. When done, reply with a plain-text summary and no tool call.'` | `""` | StringLiteral |
| 26 | ` role: 'user', content: prompt },` | `{}` | ObjectLiteral |
| 26 | `user',` | `""` | StringLiteral |
| 30 | `tep < maxSteps;` | `step <= maxSteps` | EqualityOperator |
| 30 | `tep++)` | `step--` | UpdateOperator |
| 36 | `tep + 1,` | `step - 1` | ArithmeticOperator |
| 51 | `eply.content ?? '',` | `reply.content && ''` | LogicalOperator |
| 51 | `tep + 1,` | `step - 1` | ArithmeticOperator |
| 54 | `ecision === 'deny'` | `false` | ConditionalExpression |
| 54 | `deny'` | `""` | StringLiteral |
| 58 | ` role: 'tool', tool_call_id: call.id, content: JSON.stringify(envelope) })` | `{}` | ObjectLiteral |
| 58 | `tool',` | `""` | StringLiteral |

### npm/src/core/manifest.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 10 | `
  const properties = {}
  const required = []
  for (const [key, spec] of Object.entries(input)) {
    properties[key] = spec.description ? { type: spec.type, description: spec.description } : { type: spec.type }
    if (spec.required) required.push(key)
  }
  return required.length ? { type: 'object', properties, required } : { type: 'object', properties }
}` | `{}` | BlockStatement |
| 12 | `]` | `["Stryker was here"]` | ArrayDeclaration |
| 13 | `
    properties[key] = spec.description ? { type: spec.type, description: spec.description } : { type: spec.type }
    if (spec.required) required.push(key)
  }` | `{}` | BlockStatement |
| 14 | ` type: spec.type }` | `{}` | ObjectLiteral |
| 15 | `pec.required)` | `true` | ConditionalExpression |
| 15 | `pec.required)` | `false` | ConditionalExpression |
| 17 | ` type: 'object', properties, required } ` | `{}` | ObjectLiteral |
| 17 | `object',` | `""` | StringLiteral |
| 17 | ` type: 'object', properties }` | `{}` | ObjectLiteral |
| 17 | `object',` | `""` | StringLiteral |
| 27 | `atalog.filter(tool => allow(tool)).` | `catalog` | MethodExpression |
| 28 | `function',` | `""` | StringLiteral |

### npm/src/core/omlx-models.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 16 | `response.ok)` | `false` | ConditionalExpression |
| 18 | `ata?.data)` | `data.data` | OptionalChaining |
| 18 | `?.id)` | `m.id` | OptionalChaining |

**Приклад тесту** (`npm/src/core/omlx-models.test.js`):

```js
  it('returns [] without a baseUrl (no fetch)', async () => {
    const fetchFn = vi.fn()
    expect(await listOmlxModels({ fetchFn })).toEqual([])
    expect(fetchFn).not.toHaveBeenCalled()
  })
```

### npm/src/core/resolve-omlx-base-url.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 11 | `http://127.0.0.1:8000/v1'` | `""` | StringLiteral |
| 50 | `ypeof AbortSignal?.timeout === 'function' ` | `true` | ConditionalExpression |
| 50 | `bortSignal?.timeout ` | `AbortSignal.timeout` | OptionalChaining |
| 73 | `robeOptions.proxyUrl ?? PROXY_OMLX_BASE_URL` | `probeOptions.proxyUrl && PROXY_OMLX_BASE_URL` | LogicalOperator |
| 75 | `ow() < cached.expiresAt)` | `now() <= cached.expiresAt` | EqualityOperator |

**Приклад тесту** (`npm/src/core/resolve-omlx-base-url.test.js`):

```js
  it('accepts the default local omlx hosts', () => {
    expect(isDirectOmlxUrl('http://127.0.0.1:8000/v1')).toBe(true)
    expect(isDirectOmlxUrl('http://localhost:8000/v1')).toBe(true)
  })
```

### npm/src/core/scope.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 26 | `ctor?.kind]` | `actor.kind` | OptionalChaining |
| 28 | `ctor?.kind ` | `actor.kind` | OptionalChaining |
| 40 | `lassify(catalog, actorTiers, actor, tool.name) !== 'deny')` | `true` | ConditionalExpression |
| 40 | `deny')` | `""` | StringLiteral |

**Приклад тесту** (`npm/src/core/scope.test.js`):

```js
  it('lets a human run every tier directly', () => {
    expect(classify(catalog, undefined, human, 'scan')).toBe('allow')
    expect(classify(catalog, undefined, human, 'create')).toBe('allow')
    expect(classify(catalog, undefined, human, 'remove')).toBe('allow')
  })
```
