# release-action

> Create github releases

## Example Usage

```yml
- name: Create release
  uses: jaeseokk/release-action@main
  with:
    # Default: ${{ github.token }}
    token: ${{ secrets.GITHUB_TOKEN }}
    # Default: ''
    packageNamespace: '@namespace'
```

## license

[MIT](/LICENSE) &copy; 2021 jaeseokk
