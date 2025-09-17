# GitLab CLI (GLAB) Reference Guide

**For users familiar with GitHub CLI (gh) transitioning to GitLab CLI (glab)**

## Overview

GitLab CLI (`glab`) is the official command-line interface for GitLab, equivalent to GitHub's `gh` CLI. This guide maps GitHub CLI concepts to GitLab CLI equivalents and provides comprehensive usage patterns.

## Key Terminology Differences

| GitHub | GitLab |
|--------|--------|
| Pull Request (PR) | Merge Request (MR) |
| Repository | Project |
| GitHub Actions | GitLab CI/CD |
| Workflow Run | Pipeline |
| Repository Owner | Group/Namespace |

## Installation

```bash
# macOS
brew install glab

# Ubuntu/Debian
curl -s https://api.github.com/repos/profclems/glab/releases/latest | grep browser_download_url | grep linux_amd64 | cut -d '"' -f 4 | wget -qi -
sudo dpkg -i glab*.deb

# Windows
scoop install glab
```

## Authentication & Configuration

### Basic Authentication

```bash
# Authenticate to GitLab.com
glab auth login

# Authenticate to self-hosted GitLab (enterprise)
glab auth login --hostname gitlab.company.com --token YOUR_TOKEN

# Check authentication status
glab auth status

# Logout
glab auth logout --hostname gitlab.company.com
```

### Host Configuration

```bash
# Set default GitLab host (for self-hosted instances)
glab config set gitlab_host gitlab.company.com

# Get current host
glab config get gitlab_host

# List all configuration
glab config get
```

### Environment Variables

```bash
# Set GitLab host for single command
GITLAB_HOST=gitlab.company.com glab issue list

# Set token (alternative to interactive auth)
export GITLAB_TOKEN=your_personal_access_token

# Set default host globally
export GITLAB_HOST=gitlab.company.com
```

## Issues Management

### Listing Issues

```bash
# List all issues in current project
glab issue list

# List issues assigned to you
glab issue list --assignee @me

# List issues with specific label
glab issue list --label "bug"
glab issue list --label "on-prem1"

# List issues in specific project
glab issue list -R group/project-name

# Filter by state
glab issue list --closed
glab issue list --all

# Advanced filtering
glab issue list --assignee @me --label "bug" --milestone "v1.0"

# Search in issues
glab issue list --search "authentication error"
```

### Viewing Issues

```bash
# View issue details
glab issue view 123

# View issue in specific project
glab issue view 123 -R group/project-name

# Output as JSON
glab issue view 123 --output json
```

### Creating and Managing Issues

```bash
# Create new issue
glab issue create

# Create with title and description
glab issue create --title "Bug report" --description "Description here"

# Assign issue
glab issue create --assignee @me

# Add labels
glab issue create --label "bug,urgent"

# Edit existing issue
glab issue edit 123

# Close issue
glab issue close 123

# Reopen issue
glab issue reopen 123
```

## Merge Requests (GitLab's Pull Requests)

### Listing Merge Requests

```bash
# List all merge requests
glab mr list

# List my merge requests
glab mr list --assignee @me

# List by state
glab mr list --merged
glab mr list --closed
glab mr list --draft

# List in specific project
glab mr list -R group/project-name
```

### Creating Merge Requests

```bash
# Create MR from current branch
glab mr create

# Create with details
glab mr create --title "Fix authentication" --description "Fixes issue #123"

# Create draft MR
glab mr create --draft

# Set target branch
glab mr create --target-branch develop

# Assign reviewers
glab mr create --reviewer @username1,@username2
```

### Managing Merge Requests

```bash
# View MR details
glab mr view 456

# Checkout MR branch locally
glab mr checkout 456

# Merge MR
glab mr merge 456

# Close MR without merging
glab mr close 456

# Approve MR
glab mr approve 456

# Edit MR
glab mr edit 456
```

## CI/CD Pipeline Management

### Pipeline Operations

```bash
# List pipelines
glab ci list

# View pipeline details
glab ci view 12345

# Watch pipeline progress
glab ci watch 12345

# Retry failed pipeline
glab ci retry 12345

# Cancel running pipeline
glab ci cancel 12345

# Trigger manual pipeline
glab ci run
```

### Job Management

```bash
# List jobs in pipeline
glab job list --pipeline 12345

# View job details and logs
glab job view 67890

# Download job artifacts
glab job artifacts 67890

# Retry specific job
glab job retry 67890
```

## Repository/Project Operations

### Project Information

```bash
# View current project details
glab repo view

# View specific project
glab repo view group/project-name

# Clone project
glab repo clone group/project-name

# Fork project
glab repo fork group/project-name
```

### Repository Management

```bash
# Create new project
glab repo create my-new-project

# Archive project
glab repo archive group/project-name

# Delete project (use with caution)
glab repo delete group/project-name
```

## Advanced Usage

### Direct API Calls

```bash
# Get current user info
glab api user

# Get project information
glab api projects/123

# Custom API endpoint
glab api "groups/456/projects"

# POST request with data
glab api projects/123/issues --method POST --field title="New Issue"
```

### Labels and Milestones

```bash
# List labels
glab label list

# Create label
glab label create "new-feature" --color "#FF0000"

# List milestones
glab milestone list

# Create milestone
glab milestone create "v2.0" --description "Version 2.0 release"
```

### Release Management

```bash
# List releases
glab release list

# View release details
glab release view v1.0.0

# Create release
glab release create v1.0.0 --notes "Release notes here"
```

## Troubleshooting

### Common Authentication Issues

```bash
# Problem: "401 Unauthorized" with self-hosted GitLab
# Solution: Ensure correct host is set
glab config set gitlab_host your-gitlab.company.com

# Problem: Token appears invalid
# Solution: Generate new personal access token with correct scopes:
# - api (for full API access)
# - read_repository (for repository access)
# - write_repository (for writing to repositories)

# Problem: SSO complications
# Solution: Use environment variable override
GITLAB_HOST=your-gitlab.company.com glab issue list --assignee @me
```

### Username Resolution Issues

```bash
# Problem: "failed to find user by name: username"
# Solution: Use @me for self-reference
glab issue list --assignee @me

# Problem: Complex usernames with special characters
# Solution: Use user ID instead of username
glab issue list --assignee 12345
```

### Project Access Issues

```bash
# Problem: Repository not found
# Solution: Use full group/project path
glab issue list -R DevOps/apps/project-name

# Problem: Permission denied
# Solution: Check your access level to the project
glab api projects/123/members
```

## Environment Setup Best Practices

### For Self-Hosted GitLab

```bash
# Set permanent environment variables in shell profile
echo 'export GITLAB_HOST=gitlab.company.com' >> ~/.bashrc
echo 'export GITLAB_TOKEN=your_token_here' >> ~/.bashrc

# Or use glab config for persistence
glab config set gitlab_host gitlab.company.com
```

### For Multiple GitLab Instances

```bash
# Use aliases for different instances
alias glab-prod='GITLAB_HOST=gitlab.company.com glab'
alias glab-dev='GITLAB_HOST=gitlab-dev.company.com glab'

# Usage
glab-prod issue list --assignee @me
glab-dev mr list
```

## Workflow Examples

### Daily Issue Management

```bash
# Check my assigned issues across all projects
glab issue list --assignee @me --all

# View specific issue details
glab issue view 123 -R group/project

# Update issue status
glab issue edit 123 --add-label "in-progress"
```

### Code Review Workflow

```bash
# List MRs awaiting my review
glab mr list --reviewer @me

# Checkout and test MR locally
glab mr checkout 456

# Approve after testing
glab mr approve 456

# Merge when ready
glab mr merge 456
```

### CI/CD Monitoring

```bash
# Watch pipeline for current branch
glab ci watch

# Check status of specific pipeline
glab ci view 12345

# Download artifacts from successful job
glab job artifacts 67890 --download
```

## Command Reference Quick Map

### GitHub CLI → GitLab CLI

| GitHub CLI | GitLab CLI | Notes |
|------------|------------|-------|
| `gh auth login` | `glab auth login` | Add `--hostname` for self-hosted |
| `gh issue list` | `glab issue list` | Same syntax |
| `gh issue view` | `glab issue view` | Same syntax |
| `gh pr list` | `glab mr list` | PR → MR terminology |
| `gh pr create` | `glab mr create` | PR → MR terminology |
| `gh pr merge` | `glab mr merge` | PR → MR terminology |
| `gh run list` | `glab ci list` | Workflow → Pipeline |
| `gh run view` | `glab ci view` | Workflow → Pipeline |
| `gh repo view` | `glab repo view` | Same syntax |
| `gh repo clone` | `glab repo clone` | Same syntax |
| `gh api` | `glab api` | Same syntax |

## Integration with VS Code and IDEs

```bash
# Open issue in browser
glab issue view 123 --web

# Open MR in browser
glab mr view 456 --web

# Open project in browser
glab repo view --web
```

This comprehensive guide covers the essential patterns for using GitLab CLI effectively, especially for users transitioning from GitHub CLI or working with enterprise GitLab instances.