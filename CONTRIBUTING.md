# Contributing to BorjaxAI

Thank you for your interest in contributing! 🎉

## Ways to Contribute

- 🐛 **Bug reports** — Open an issue with the bug report template
- 💡 **Feature requests** — Open an issue with the feature request template
- 🔧 **Code contributions** — Fork → branch → PR
- 📚 **Documentation** — Improve or add docs pages
- 🌍 **Translations** — Help translate the UI
- ⭐ **Spread the word** — Star the repo, share with others

## Development Setup

Follow the [Getting Started](README.md#getting-started-local-dev) guide in README.md.

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with clear commit messages
4. Run tests: `pytest apps/ai/tests/` and `bun test` in `apps/gateway/`
5. Submit a PR against `main` with a clear description

## Commit Convention

We use [Conventional Commits](https://conventionalcommits.org):

```
feat(web): add dark mode toggle
fix(api): handle empty message body
docs(agents): add agent best practices
chore: update dependencies
```

## Code Style

- **TypeScript/JS**: Prettier defaults, 2-space indent
- **Python**: Black formatter, 4-space indent, type hints preferred
- **CSS**: BEM-like naming, CSS variables for all colors

## Reporting Security Issues

Please **do not** open public issues for security vulnerabilities.
Email: security@borjaxai.com

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). Be kind. ❤️
