# GitHub Repository Setup Guide

## Step 1: Install Git (if not already installed)

If Git is not installed on your system, download and install it from:
- **Windows**: https://git-scm.com/download/win
- After installation, restart your terminal/command prompt

## Step 2: Create a GitHub Repository

1. Go to https://github.com and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the repository details:
   - **Repository name**: `Aljawhara.new.Angular` (or your preferred name)
   - **Description**: (optional) Add a description
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 3: Initialize Git and Push to GitHub

Open PowerShell or Command Prompt in your project directory and run these commands:

```powershell
# Navigate to your project directory
cd "C:\otherProject\Aljawhara.new.Angular"

# Initialize Git repository
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit"

# Add your GitHub repository as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename default branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using GitHub Desktop

If you prefer a graphical interface:

1. Download GitHub Desktop from: https://desktop.github.com/
2. Sign in with your GitHub account
3. Click **"File"** → **"Add Local Repository"**
4. Select your project folder: `C:\otherProject\Aljawhara.new.Angular`
5. Click **"Publish repository"** to create a new GitHub repository and push your code

## Troubleshooting

### If you get authentication errors:
- Use a Personal Access Token instead of password
- Generate one at: https://github.com/settings/tokens
- Or use GitHub Desktop for easier authentication

### If Git is still not recognized:
- Make sure Git is added to your system PATH
- Restart your terminal after installation
- Try using Git Bash instead of PowerShell

