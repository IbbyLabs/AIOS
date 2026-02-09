# Docker Hub Setup Guide (For Future Use)

This guide explains how to add Docker Hub publishing when you're ready.

## Prerequisites

- Docker Hub account
- Access to repository settings

## Step 1: Create Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com)
2. Go to Account Settings → Security
3. Click "New Access Token"
4. Description: "GitHub Actions - AIOS"
5. Permissions: Read & Write
6. Click "Generate" and **copy the token immediately**

## Step 2: Add GitHub Secrets

1. Go to: https://github.com/IbbyLabs/AIOS/settings/secrets/actions
2. Add two secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: The access token from Step 1

## Step 3: Update Workflows

Edit `.github/workflows/deploy-docker.yml`:

### 3.1 Add Docker Hub Login Step

Add the following step immediately after the "Login to GitHub Container Registry" step:

```yaml
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
```

### 3.2 Update Image Tags Calculation

Replace the entire "Calculate Image Tags" step with the following:

```yaml
      - name: Calculate Image Tags
        env:
          INPUT_REF: ${{inputs.ref}}
        run: |
          declare TAGS=""
          case "${INPUT_REF}" in
          v[0-9]*.[0-9]*.[0-9]*)
            TAGS="${INPUT_REF}"
            if [[ "$(git rev-parse origin/main)" = "$(git rev-parse "${INPUT_REF}")" ]]; then
              TAGS="${TAGS} latest"
            fi
            CHANNEL="stable"
            ;;
          [0-9]*.[0-9]*.[0-9]*-nightly)
            TAGS="${INPUT_REF} nightly"
            CHANNEL="nightly"
            ;;
          *)
            echo "Invalid Input Ref: ${INPUT_REF}"
            exit 1
          esac

          if [[ -z "${TAGS}" ]]; then
            echo "Empty Tags!"
            exit 1
          fi

          {
            echo 'DOCKER_IMAGE_TAGS<<EOF'
            for tag in ${TAGS}; do
            echo "YOUR_DOCKERHUB_USERNAME/aios:${tag}"
            echo "ghcr.io/${{ github.repository_owner }}/aios:${tag}"
            done
            echo EOF
          } >> "${GITHUB_ENV}"

          echo "TAGS=${TAGS}" >> "${GITHUB_ENV}"
          echo "CHANNEL=${CHANNEL}" >> "${GITHUB_ENV}"
          cat "${GITHUB_ENV}"
```

**Note:** Replace `YOUR_DOCKERHUB_USERNAME` with your actual Docker Hub username.

### 3.3 Update Discord Notification

Update the "View Images" field in the Discord notification step:

```yaml
                  {
                    "name": "📍 View Images",
                    "value": "[Docker Hub](https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/aios) · [GHCR](https://github.com/${{ github.repository_owner }}/AIOS/pkgs/container/aios)",
                    "inline": false
                  },
```

**Note:** Replace `YOUR_DOCKERHUB_USERNAME` with your actual Docker Hub username.

## Step 4: Test the Setup

1. Commit and push your changes
2. Manually trigger the workflow via GitHub Actions UI:
   - Go to: https://github.com/IbbyLabs/AIOS/actions/workflows/deploy-docker.yml
   - Click "Run workflow"
   - Enter a test tag (e.g., `v1.0.0-test`)
   - Monitor the workflow run to ensure both Docker Hub and GHCR pushes succeed

## Step 5: Verify Images

After a successful workflow run, verify the images are published:

1. **Docker Hub**: https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/aios
2. **GHCR**: https://github.com/IbbyLabs/AIOS/pkgs/container/aios

## Troubleshooting

### Authentication Failures

If you see "unauthorized: authentication required" errors:
- Verify that the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are set correctly
- Ensure the access token has "Read & Write" permissions
- Check that the token hasn't expired

### Image Not Found

If you see "repository does not exist" errors:
- Make sure the repository name in the workflow matches your Docker Hub repository
- Verify your Docker Hub username is correct
- Ensure you have permission to push to the repository

### Rate Limiting

Docker Hub has rate limits for anonymous pulls:
- Free accounts: 100 pulls per 6 hours
- Authenticated users: 200 pulls per 6 hours
- Pro/Team accounts: Higher limits

If you hit rate limits, consider upgrading your Docker Hub account or adjusting your workflow frequency.

## Security Considerations

1. **Never commit Docker Hub credentials directly in workflow files**
2. **Always use GitHub Secrets for sensitive information**
3. **Regularly rotate access tokens (every 90 days recommended)**
4. **Use least-privilege tokens (only the permissions needed)**
5. **Monitor Docker Hub for unauthorized access**

## Additional Resources

- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [GitHub Actions Docker Login](https://github.com/docker/login-action)
- [Docker Build and Push Action](https://github.com/docker/build-push-action)
