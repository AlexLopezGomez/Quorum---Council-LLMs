## Security Policy

Quorum handles evaluation inputs, model provider credentials, and deployment
configuration. If you discover a security issue, please report it privately and
do not open a public issue.

### Reporting a Vulnerability

Use GitHub's private vulnerability reporting flow for this repository:

- https://github.com/AlexLopezGomez/Quorum---Council-LLMs/security/advisories/new

If private reporting is unavailable in your environment, contact the maintainer
through GitHub at:

- https://github.com/AlexLopezGomez

Please include:

- A clear description of the issue and impacted component
- Reproduction steps or a proof of concept
- Potential impact
- Any suggested mitigation, if known

### Response Expectations

- Acknowledgment within 72 hours
- Initial triage within 7 days
- Ongoing status updates for confirmed issues until resolution or mitigation

### Scope

This policy applies to security issues in the open-source repository,
including:

- API key and secret handling
- JWT/session secret exposure
- MongoDB exposure or unsafe default configuration
- Authentication and authorization flaws
- Injection, deserialization, path traversal, or remote code execution risks
- Vulnerabilities in the benchmark runner, SDKs, GitHub Action, and deployment
  configuration that could impact users or maintainers

### Out of Scope

The following are generally out of scope unless they lead to a concrete
security impact:

- Missing rate limits without an exploit path
- Best-practice suggestions without a demonstrable vulnerability
- Issues in third-party services that are not caused by Quorum code or config
- Self-XSS that requires pasting attacker-provided code into developer tools

### Secret Handling

Please do not include real API keys, tokens, database dumps, or other sensitive
material in reports. Use redacted examples whenever possible.

The repository is intended to remain free of production secrets. Use
`backend/.env.example` as the public template and keep live credentials in local
or platform-managed secret storage.
