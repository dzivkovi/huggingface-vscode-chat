# GitLab CLI (GLAB) Reference Guide

**For AI assistants and users familiar with GitHub CLI (gh) transitioning to GitLab CLI (glab)**

## Quick Mental Model

**Command Pattern**: `glab <object> <action> <target> [flags]`

**Core Objects**:
- `issue` - Issues (GitHub: issues)
- `mr` - Merge Requests (GitHub: pull requests)
- `ci` - Pipelines (GitHub: workflow runs)
- `repo` - Projects (GitHub: repositories)
- `auth` - Authentication

**Essential Actions**: `list`, `view`, `create`, `update`, `close`, `merge`

## Installation & Authentication

### Quick Setup
```bash
# Install
brew install glab                    # macOS
scoop install glab                   # Windows

# Authenticate
glab auth login                      # GitLab.com
glab auth login --hostname gitlab.company.com --token TOKEN  # Enterprise
glab auth status                     # Verify
```

### Enterprise Configuration
```bash
# Set default host (persistent)
glab config set gitlab_host gitlab.company.com

# Per-command override (most reliable for complex environments)
GITLAB_HOST=gitlab.company.com glab issue list

# Environment variables for automation
export GITLAB_TOKEN=your_personal_access_token
export GITLAB_HOST=gitlab.company.com

# Multi-instance aliases (essential for daily use)
alias glab-prod='GITLAB_HOST=gitlab.company.com glab'
alias glab-dev='GITLAB_HOST=gitlab-dev.company.com glab'
```

## Essential Operations

### Viewing (Safest Operations)
```bash
# List items
glab issue list                      # All issues
glab issue list --assignee @me      # My issues
glab mr list --assignee @me         # My merge requests
glab ci list                         # Recent pipelines

# View details
glab issue view 123                  # Issue details
glab mr view 456                     # MR details
glab ci view 789                     # Pipeline details

# Cross-project access (CRITICAL: use exact group/project path)
glab issue list -R DevOps/apps/codesentinel-lite
glab issue view 123 -R DevOps/apps/project-name
```

### Creating Items
```bash
# Interactive creation
glab issue create                    # Opens editor
glab mr create                       # Creates from current branch

# Direct creation
glab issue create --title "Bug fix" --assignee @me --label "bug,urgent"
glab mr create --title "Feature" --description "Details" --reviewer @teammate
```

### Managing Items

#### Issues: Use `update` NOT `edit`
```bash
# CORRECT: Use glab issue update
glab issue update 123 --label "state::in progress"     # Add label
glab issue update 123 --unlabel "old-label"            # Remove label

# WRONG: Don't use glab issue edit for labels
# ❌ glab issue edit 123 --label "new-label"  # This command exists but doesn't support --label!
```

#### Merge Requests: Use `edit` for details, workflow commands for actions
```bash
# Edit MR details
glab mr edit 456                     # Opens editor for title/description

# MR workflow actions
glab mr approve 456                  # Approve MR
glab mr merge 456                    # Merge MR
glab mr close 456                    # Close without merging
```

#### Closing Workflows
```bash
# Issues: Comment first, then close (no --comment flag exists)
glab issue comment 123 --message "Fixed and tested ✅"
glab issue close 123

# Merge Requests: Direct actions
glab mr merge 456                    # Merge and close
glab mr close 456                    # Close without merging
```

## Common Gotchas & Fixes

### 1. Command Confusion
**Problem**: Mixing `issue edit` and `issue update` capabilities
```bash
# ✅ CORRECT usage
glab issue update 123 --label "bug"           # For labels, assignees, milestones
glab issue edit 123                           # For title/description (opens editor)

# ❌ WRONG - these don't work
glab issue edit 123 --label "bug"            # edit doesn't support --label
glab issue close 123 --comment "Done"        # close doesn't support --comment
```

### 2. Board Visibility Issues
**Problem**: Issues missing from GitLab boards despite having labels
**Root Cause**: Boards filter by ALL required labels
```bash
# Debug: Check exact labels
glab issue view 123 --output json | grep -A5 '"labels"'

# Fix: Add missing labels (common missing: state::in progress)
glab issue update 123 --label "state::in progress"

# Verify visibility
glab issue list --assignee @me --label "on-prem1"
```

### 3. Authentication Problems
```bash
# Enterprise GitLab: Set correct host first
glab config set gitlab_host your-gitlab.company.com
glab auth login --hostname your-gitlab.company.com

# Token issues: Generate with these scopes
# - api (full API access)
# - read_repository, write_repository

# SSO complications: Use environment variable override
GITLAB_HOST=your-gitlab.company.com glab issue list --assignee @me

# Username resolution issues
glab issue list --assignee @me              # Use @me for self-reference
glab issue list --assignee 12345            # Use user ID for complex usernames

# Project access issues
glab issue list -R DevOps/apps/project-name # Use full group/project path
glab api projects/123/members               # Check access level
```

## Advanced Techniques

### Complex Content Creation
```bash
# Use HEREDOC for detailed descriptions
glab issue create --title "Complex Implementation" \
  --assignee @me --label "epic,on-prem1" \
  --description "$(cat <<'EOF'
## Technical Implementation

### Deliverables
- Performance: 40-70 tokens/sec validated
- Documentation: analysis/2025-09-16/
- Repository: https://github.com/user/project

### Status
✅ All acceptance criteria met
EOF
)"
```

### JSON Debugging
```bash
# Get complete metadata
glab issue view 123 --output json

# Extract specific fields (requires jq)
glab issue view 123 --output json | jq '.labels[]'
glab issue view 123 --output json | jq '.assignees[].username'
glab issue view 123 --output json | jq '.milestone.title'

# Compare issues for troubleshooting
glab issue view 33 --output json > working.json
glab issue view 42 --output json > broken.json
diff working.json broken.json

# Check project-level settings
glab api projects/55809 | jq '.visibility, .issues_enabled, .merge_requests_enabled'

# Board configuration debugging
glab api projects/55809/boards

# Quick label check without jq
glab issue view 123 --output json | grep -A5 '"labels"'
```

### API Access
```bash
# Direct GitLab API calls
glab api user                               # Current user
glab api projects/123                       # Project details
glab api projects/123/issues --method POST --field title="New Issue"
```

## Quick Reference

### GitHub CLI → GitLab CLI
| GitHub CLI | GitLab CLI | Key Differences |
|------------|------------|-----------------|
| `gh issue list` | `glab issue list` | Same syntax |
| `gh issue create` | `glab issue create` | Same syntax |
| `gh issue edit` | `glab issue update` | **Different**: Use `update` for labels/assignees |
| `gh pr list` | `glab mr list` | **PR → MR** terminology |
| `gh pr create` | `glab mr create` | **PR → MR** terminology |
| `gh pr merge` | `glab mr merge` | **PR → MR** terminology |
| `gh run list` | `glab ci list` | **Workflow → Pipeline** |
| `gh repo clone` | `glab repo clone` | Same syntax |

### Essential Command Patterns
```bash
# Viewing patterns (read-only, always safe)
glab <object> list [--assignee @me] [--label "label"] [-R project]
glab <object> view <id> [--output json] [-R project]

# Creation patterns
glab <object> create [--title "title"] [--assignee @me] [--label "labels"]

# Update patterns (state changes)
glab issue update <id> --label "label"      # Issues: use update for metadata
glab mr edit <id>                           # MRs: use edit for details

# Workflow patterns
glab issue close <id>                       # Direct close
glab mr merge <id>                          # Merge and close
glab ci watch <id>                          # Monitor progress
```

### Troubleshooting Checklist
1. **Command not working?** Check object vs action (issue/mr, update/edit)
2. **Missing from board?** Verify ALL required labels present
3. **Authentication failing?** Set correct gitlab_host for enterprise
4. **Can't find issue?** Use `-R group/project-name` for cross-project access
5. **Need details?** Add `--output json` for complete metadata

### Common Workflows
```bash
# Daily issue check (across all projects)
glab issue list --assignee @me --all

# Specific project focus
glab issue list --assignee @me -R DevOps/apps/project-name

# Complete an issue professionally
glab issue comment 123 --message "All requirements met ✅"
glab issue close 123

# Review merge request
glab mr view 456
glab mr checkout 456                        # Test locally
glab mr approve 456                         # Approve
glab mr merge 456                           # Merge

# Monitor CI/CD
glab ci list
glab ci watch 789                           # Follow pipeline progress
glab job artifacts 67890 --download         # Download artifacts

# Cross-instance workflow
glab-prod issue list --assignee @me --label "on-prem1"
glab-dev mr list --assignee @me
```

## Browser Integration
```bash
# Open in GitLab web interface
glab issue view 123 --web
glab mr view 456 --web
glab repo view --web
```

---

**Key Principles for AI Assistants:**
1. **Use `glab issue update` for labels/assignees, NOT `glab issue edit`**
2. **Comment first, then close - no combined flags exist**
3. **Check labels with `--output json` when debugging board visibility**
4. **Always use `-R project-name` for cross-project operations**
5. **Enterprise GitLab requires `gitlab_host` configuration first**