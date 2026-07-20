# Coverage

| Область | Рядки | Функції | Вбито мутацій | Score |
| --- | --- | --- | --- | --- |
| JS | 63.35% (102/161) | 60.87% (28/46) | 214/875 | 24.46% |
| Vue (Storybook) | 53.51% (61/114) | 44.19% (19/43) | 0/0 | — |
| **Разом** | 59.27% (163/275) | 52.81% (47/89) | 214/875 | 24.46% |

## Вцілілі мутанти

```json
[
  {
    "file": "npm/src/core/acp-kit.js",
    "mutants": [
      {
        "line": 22,
        "col": 42,
        "mutantType": "StringLiteral",
        "original": "acp' ",
        "replacement": "\"\""
      },
      {
        "line": 23,
        "col": 21,
        "mutantType": "Regex",
        "original": "\\?\\s*$/",
        "replacement": "/\\?\\s*/"
      },
      {
        "line": 23,
        "col": 21,
        "mutantType": "Regex",
        "original": "\\?\\s*$/",
        "replacement": "/\\?\\S*$/"
      },
      {
        "line": 30,
        "col": 10,
        "mutantType": "ConditionalExpression",
        "original": "ypeof text === 'string' ",
        "replacement": "true"
      },
      {
        "line": 30,
        "col": 55,
        "mutantType": "MethodExpression",
        "original": "ext.trim())",
        "replacement": "text"
      },
      {
        "line": 41,
        "col": 39,
        "mutantType": "ConditionalExpression",
        "original": "urn.stopped === 'refusal')",
        "replacement": "false"
      },
      {
        "line": 41,
        "col": 56,
        "mutantType": "StringLiteral",
        "original": "refusal')",
        "replacement": "\"\""
      },
      {
        "line": 42,
        "col": 12,
        "mutantType": "ConditionalExpression",
        "original": "urn.stopped === 'cancelled')",
        "replacement": "false"
      },
      {
        "line": 42,
        "col": 29,
        "mutantType": "StringLiteral",
        "original": "cancelled')",
        "replacement": "\"\""
      },
      {
        "line": 77,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "dispatch)",
        "replacement": "false"
      },
      {
        "line": 93,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "ctiveRequestId)",
        "replacement": "true"
      },
      {
        "line": 112,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "activeRequestId)",
        "replacement": "false"
      },
      {
        "line": 148,
        "col": 21,
        "mutantType": "ArrayDeclaration",
        "original": "...baseActions, ...turn.trace]",
        "replacement": "[]"
      },
      {
        "line": 122,
        "col": 9,
        "mutantType": "ConditionalExpression",
        "original": "istening)",
        "replacement": "false"
      },
      {
        "line": 123,
        "col": 17,
        "mutantType": "BooleanLiteral",
        "original": "rue",
        "replacement": "false"
      },
      {
        "line": 149,
        "col": 37,
        "mutantType": "ObjectLiteral",
        "original": " ...fields, messages: turn.messages, actions, pendingApproval: null })",
        "replacement": "{}"
      },
      {
        "line": 163,
        "col": 32,
        "mutantType": "ObjectLiteral",
        "original": " status: 'running' })",
        "replacement": "{}"
      },
      {
        "line": 162,
        "col": 39,
        "mutantType": "ObjectLiteral",
        "original": " intent, actor: AGENT_ACTOR })",
        "replacement": "{}"
      },
      {
        "line": 167,
        "col": 32,
        "mutantType": "ObjectLiteral",
        "original": " acp: { agentKind: session.agentKind, sessionKey: session.sessionKey } })",
        "replacement": "{}"
      },
      {
        "line": 163,
        "col": 42,
        "mutantType": "StringLiteral",
        "original": "running' ",
        "replacement": "\"\""
      },
      {
        "line": 168,
        "col": 32,
        "mutantType": "ArrayDeclaration",
        "original": "],",
        "replacement": "[\"Stryker was here\"]"
      },
      {
        "line": 168,
        "col": 52,
        "mutantType": "ObjectLiteral",
        "original": " sessionKey: activeSessionKey, text: intent })",
        "replacement": "{}"
      },
      {
        "line": 231,
        "col": 11,
        "mutantType": "LogicalOperator",
        "original": "ecord.status !== 'needs_approval' || !pending)",
        "replacement": "record.status !== 'needs_approval' && !pending"
      },
      {
        "line": 231,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "ecord.status !== 'needs_approval' ",
        "replacement": "false"
      },
      {
        "line": 231,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "ecord.status !== 'needs_approval' || !pending)",
        "replacement": "false"
      },
      {
        "line": 167,
        "col": 39,
        "mutantType": "ObjectLiteral",
        "original": " agentKind: session.agentKind, sessionKey: session.sessionKey } ",
        "replacement": "{}"
      },
      {
        "line": 275,
        "col": 19,
        "mutantType": "ArrayDeclaration",
        "original": "...(record.actions ?? []), { tool: pending.tool, input: pending.input, envelope }]",
        "replacement": "[]"
      },
      {
        "line": 275,
        "col": 24,
        "mutantType": "LogicalOperator",
        "original": "ecord.actions ?? [])",
        "replacement": "record.actions && []"
      },
      {
        "line": 276,
        "col": 35,
        "mutantType": "ObjectLiteral",
        "original": " status: 'running', actions, pendingApproval: null })",
        "replacement": "{}"
      },
      {
        "line": 275,
        "col": 47,
        "mutantType": "ObjectLiteral",
        "original": " tool: pending.tool, input: pending.input, envelope }]",
        "replacement": "{}"
      },
      {
        "line": 276,
        "col": 45,
        "mutantType": "StringLiteral",
        "original": "running',",
        "replacement": "\"\""
      },
      {
        "line": 296,
        "col": 33,
        "mutantType": "StringLiteral",
        "original": "allow' ",
        "replacement": "\"\""
      },
      {
        "line": 297,
        "col": 45,
        "mutantType": "OptionalChaining",
        "original": ".kind?.startsWith(",
        "replacement": "o.kind.startsWith"
      },
      {
        "line": 297,
        "col": 18,
        "mutantType": "OptionalChaining",
        "original": "ending.options?.find(",
        "replacement": "pending.options.find"
      },
      {
        "line": 298,
        "col": 54,
        "mutantType": "OptionalChaining",
        "original": "ption?.optionId)",
        "replacement": "option.optionId"
      },
      {
        "line": 300,
        "col": 45,
        "mutantType": "StringLiteral",
        "original": "running',",
        "replacement": "\"\""
      },
      {
        "line": 300,
        "col": 35,
        "mutantType": "ObjectLiteral",
        "original": " status: 'running', pendingApproval: null })",
        "replacement": "{}"
      },
      {
        "line": 305,
        "col": 14,
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
    "file": "npm/src/core/dispatch.js",
    "mutants": [
      {
        "line": 19,
        "col": 11,
        "mutantType": "ConditionalExpression",
        "original": "pec.required)",
        "replacement": "true"
      },
      {
        "line": 18,
        "col": 32,
        "mutantType": "ConditionalExpression",
        "original": "alue === null)",
        "replacement": "false"
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
        "line": 38,
        "col": 73,
        "mutantType": "StringLiteral",
        "original": "Unknown tool: ${name}` ",
        "replacement": "``"
      },
      {
        "line": 23,
        "col": 23,
        "mutantType": "StringLiteral",
        "original": "object' ",
        "replacement": "\"\""
      },
      {
        "line": 38,
        "col": 29,
        "mutantType": "BooleanLiteral",
        "original": "alse,",
        "replacement": "true"
      },
      {
        "line": 41,
        "col": 31,
        "mutantType": "BooleanLiteral",
        "original": "alse,",
        "replacement": "true"
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
    "file": "npm/src/core/manifest.js",
    "mutants": [
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
        "line": 12,
        "col": 20,
        "mutantType": "ArrayDeclaration",
        "original": "]",
        "replacement": "[\"Stryker was here\"]"
      },
      {
        "line": 17,
        "col": 79,
        "mutantType": "StringLiteral",
        "original": "object',",
        "replacement": "\"\""
      },
      {
        "line": 10,
        "col": 37,
        "mutantType": "BlockStatement",
        "original": "\n  const properties = {}\n  const required = []\n  for (const [key, spec] of Object.entries(input)) {\n    properties[key] = spec.description ? { type: spec.type, description: spec.description } : { type: spec.type }\n    if (spec.required) required.push(key)\n  }\n  return required.length ? { type: 'object', properties, required } : { type: 'object', properties }\n}",
        "replacement": "{}"
      },
      {
        "line": 27,
        "col": 10,
        "mutantType": "MethodExpression",
        "original": "atalog\n    .filter(tool => allow(tool))",
        "replacement": "catalog"
      },
      {
        "line": 30,
        "col": 13,
        "mutantType": "StringLiteral",
        "original": "function',",
        "replacement": "\"\""
      }
    ],
    "exampleTest": null,
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
      },
      {
        "line": 28,
        "col": 38,
        "mutantType": "OptionalChaining",
        "original": "ctor?.kind ",
        "replacement": "actor.kind"
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
| 22 | `acp'` | `""` | StringLiteral |
| 23 | `\?\s*$/` | `/\?\s*/` | Regex |
| 23 | `\?\s*$/` | `/\?\S*$/` | Regex |
| 30 | `ypeof text === 'string'` | `true` | ConditionalExpression |
| 30 | `ext.trim())` | `text` | MethodExpression |
| 41 | `urn.stopped === 'refusal')` | `false` | ConditionalExpression |
| 41 | `refusal')` | `""` | StringLiteral |
| 42 | `urn.stopped === 'cancelled')` | `false` | ConditionalExpression |
| 42 | `cancelled')` | `""` | StringLiteral |
| 77 | `dispatch)` | `false` | ConditionalExpression |
| 93 | `ctiveRequestId)` | `true` | ConditionalExpression |
| 112 | `activeRequestId)` | `false` | ConditionalExpression |
| 148 | `...baseActions, ...turn.trace]` | `[]` | ArrayDeclaration |
| 122 | `istening)` | `false` | ConditionalExpression |
| 123 | `rue` | `false` | BooleanLiteral |
| 149 | `...fields, messages: turn.messages, actions, pendingApproval: null })` | `{}` | ObjectLiteral |
| 163 | `status: 'running' })` | `{}` | ObjectLiteral |
| 162 | `intent, actor: AGENT_ACTOR })` | `{}` | ObjectLiteral |
| 167 | `acp: { agentKind: session.agentKind, sessionKey: session.sessionKey } })` | `{}` | ObjectLiteral |
| 163 | `running'` | `""` | StringLiteral |
| 168 | `],` | `["Stryker was here"]` | ArrayDeclaration |
| 168 | `sessionKey: activeSessionKey, text: intent })` | `{}` | ObjectLiteral |
| 231 | `ecord.status !== 'needs_approval' || !pending)` | `record.status !== 'needs_approval' && !pending` | LogicalOperator |
| 231 | `ecord.status !== 'needs_approval'` | `false` | ConditionalExpression |
| 231 | `ecord.status !== 'needs_approval' || !pending)` | `false` | ConditionalExpression |
| 167 | ` agentKind: session.agentKind, sessionKey: session.sessionKey } ` | `{}` | ObjectLiteral |
| 275 | `...(record.actions ?? []), { tool: pending.tool, input: pending.input, envelope }]` | `[]` | ArrayDeclaration |
| 275 | `ecord.actions ?? [])` | `record.actions && []` | LogicalOperator |
| 276 | `status: 'running', actions, pendingApproval: null })` | `{}` | ObjectLiteral |
| 275 | `tool: pending.tool, input: pending.input, envelope }]` | `{}` | ObjectLiteral |
| 276 | `running',` | `""` | StringLiteral |
| 296 | `allow'` | `""` | StringLiteral |
| 297 | `.kind?.startsWith(` | `o.kind.startsWith` | OptionalChaining |
| 297 | `ending.options?.find(` | `pending.options.find` | OptionalChaining |
| 298 | `ption?.optionId)` | `option.optionId` | OptionalChaining |
| 300 | `running',` | `""` | StringLiteral |
| 300 | `status: 'running', pendingApproval: null })` | `{}` | ObjectLiteral |
| 305 | `ecord.actions ?? [],` | `record.actions && []` | LogicalOperator |

**Приклад тесту** (`npm/src/core/acp-kit.test.js`):

```js
  it('throws without a catalog', () => {
    expect(() => createAcpAgentKit({})).toThrow(/catalog/)
  })
```

### npm/src/core/dispatch.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 19 | `pec.required)` | `true` | ConditionalExpression |
| 18 | `alue === null)` | `false` | ConditionalExpression |
| 22 | `pec.type === 'string'` | `true` | ConditionalExpression |
| 23 | `pec.type === 'object' && (typeof value !== 'object' || Array.isArray(value)))` | `false` | ConditionalExpression |
| 38 | `Unknown tool: ${name}` ` | ```` | StringLiteral |
| 23 | `object'` | `""` | StringLiteral |
| 38 | `alse,` | `true` | BooleanLiteral |
| 41 | `alse,` | `true` | BooleanLiteral |
| 47 | `rror?.message` | `error.message` | OptionalChaining |
| 50 | `rror?.kind !== undefined)` | `true` | ConditionalExpression |
| 50 | `rror?.kind` | `error.kind` | OptionalChaining |

**Приклад тесту** (`npm/src/core/dispatch.test.js`):

```js
  it('returns an ok envelope from the transport output', async () => {
    const dispatch = createDispatch(catalog, () => 'pong')
    expect(await dispatch('ping', {})).toEqual({ ok: true, output: 'pong' })
  })
```

### npm/src/core/manifest.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
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
| 12 | `]` | `["Stryker was here"]` | ArrayDeclaration |
| 17 | `object',` | `""` | StringLiteral |
| 10 | `
  const properties = {}
  const required = []
  for (const [key, spec] of Object.entries(input)) {
    properties[key] = spec.description ? { type: spec.type, description: spec.description } : { type: spec.type }
    if (spec.required) required.push(key)
  }
  return required.length ? { type: 'object', properties, required } : { type: 'object', properties }
}` | `{}` | BlockStatement |
| 27 | `atalog
    .filter(tool => allow(tool))` | `catalog` | MethodExpression |
| 30 | `function',` | `""` | StringLiteral |

### npm/src/core/scope.js

| Рядок | Оригінал | Заміна | Тип |
| --- | --- | --- | --- |
| 26 | `ctor?.kind]` | `actor.kind` | OptionalChaining |
| 40 | `lassify(catalog, actorTiers, actor, tool.name) !== 'deny')` | `true` | ConditionalExpression |
| 40 | `deny')` | `""` | StringLiteral |
| 28 | `ctor?.kind` | `actor.kind` | OptionalChaining |

**Приклад тесту** (`npm/src/core/scope.test.js`):

```js
  it('lets a human run every tier directly', () => {
    expect(classify(catalog, undefined, human, 'scan')).toBe('allow')
    expect(classify(catalog, undefined, human, 'create')).toBe('allow')
    expect(classify(catalog, undefined, human, 'remove')).toBe('allow')
  })
```
