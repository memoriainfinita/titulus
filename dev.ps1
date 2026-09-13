#!/usr/bin/env pwsh
# Launch the TITULUS dev server on http://localhost:3000
# Sits in the project folder regardless of where it is invoked from.
Set-Location -LiteralPath $PSScriptRoot
pnpm dev
