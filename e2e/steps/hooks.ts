import { Before } from '../support/fixtures';
import { setupDefaultMocks } from '../support/mocks';

Before(async ({ page, mockState, pageObject }) => {
  // Wire route mocks BEFORE navigation so requests are intercepted from the start
  await setupDefaultMocks(page, mockState);
  // Navigate once
  await pageObject.goto();
  await pageObject.expectHeadingVisible();
});
