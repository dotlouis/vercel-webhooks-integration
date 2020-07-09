const { withUiHook, htm: html } = require('@zeit/integration-utils')

module.exports = withUiHook(async ({ payload, zeitClient }) => {
  const { clientState, action } = payload
  const store = await zeitClient.getMetadata()
  const isWebhookSet =
    action === 'submit' || (action === 'view' && !!store.webhookData)

  async function createHook(url) {
    return await zeitClient.fetchAndThrow(`/v1/integrations/webhooks`, {
      method: 'POST',
      data: {
        name: 'webhooks-platform-events',
        url,
      },
    })
  }

  async function removeHook(id) {
    const res = await zeitClient.fetch(`/v1/integrations/webhooks/${id}`, {
      method: 'DELETE',
    })
    if (res.status !== 204) {
      throw new Error(
        `Failed to delete hook with id ${id} error: ${await res.text()}`,
      )
    }
  }

  if (action === 'submit') {
    store.webhookData = await createHook(clientState.webhookUrl)
    await zeitClient.setMetadata(store)
  }

  if (action === 'remove') {
    await removeHook(store.webhookData.id)
    store.webhookData = null
    await zeitClient.setMetadata(store)
  }

  return html`
		<Page>
			<Box>
				<Input label="WebhookUrl" name="webhookUrl" value=${
          (store.webhookData && store.webhookData.url) || ''
        } />
				${
          isWebhookSet
            ? // prettier-ignore
              html`<Button action="remove">Remove</Button>`
            : // prettier-ignore
              html`<Button action="submit">Add</Button>`
        }
      </Box>
      <Notice type="warn">
      To secure your webhook, you should check it comes from Vercel.
      See <Link target="blank" href="https://vercel.com/docs/api#integrations/webhooks/securing-webhooks">Securing Webhooks</Link>
      </Notice>
		</Page>
	`
})
