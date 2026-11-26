import envVars from '../../../env/var';
import { Client, Query, TablesDB } from 'appwrite';
import productService from './product';

const ALL_PRODUCTS_BANNER_KEY = 'all_products_banner';
const ALL_PRODUCTS_BANNER_ROW_ID = 'all_products_banner';

export class SiteLayoutService {
  client = new Client();
  table;
  databaseId = envVars.ronakByAliDatabaseId;
  tableId = envVars.ronakByAliLayout;
  lastError = null;

  constructor() {
    this.client.setEndpoint(envVars.ronakByAliUrl).setProject(envVars.ronakByAliProjectId);
    this.table = new TablesDB(this.client);
  }

  async getAllProductsBanner() {
    this.lastError = null;
    try {
      const result = await this.table.listRows({
        databaseId: this.databaseId,
        tableId: this.tableId,
        queries: [Query.equal('key', ALL_PRODUCTS_BANNER_KEY), Query.limit(1)],
      });
      return { ok: true, row: result?.rows?.[0] || null };
    } catch (error) {
      return this._fail(error);
    }
  }

  async saveAllProductsBanner(imageIds, content = '') {
    this.lastError = null;
    const current = await this.getAllProductsBanner();
    if (!current.ok) return current;

    const args = {
      databaseId: this.databaseId,
      tableId: this.tableId,
      rowId: current.row?.$id || ALL_PRODUCTS_BANNER_ROW_ID,
      data: {
        key: ALL_PRODUCTS_BANNER_KEY,
        type: 'banner',
        title: 'All Products banner',
        imageIds: [...new Set((imageIds || []).filter((id) => typeof id === 'string' && id.trim()))],
        content: typeof content === 'string' ? content : '',
      },
    };

    try {
      if (current.row) {
        await this.table.updateRow(args);
      } else {
        await this.table.createRow(args);
      }
      return { ok: true };
    } catch (error) {
      return this._fail(error);
    }
  }

  async deleteImagesIfUnused(fileIds) {
    const ids = [...new Set((fileIds || []).filter((id) => typeof id === 'string' && id.trim()))];
    if (!ids.length) return { ok: true };

    this.lastError = null;
    try {
      const rows = [];
      let cursor = null;
      while (true) {
        const queries = [Query.select(['$id', 'imageIds']), Query.limit(100)];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const result = await this.table.listRows({
          databaseId: this.databaseId,
          tableId: this.tableId,
          queries,
        });
        const page = result?.rows || [];
        if (!page.length) break;
        rows.push(...page);
        if (page.length < 100) break;
        cursor = page[page.length - 1].$id;
      }
      const used = new Set(rows.flatMap((row) => row.imageIds || []));
      const unused = ids.filter((id) => !used.has(id));
      if (!await productService.deleteImagesIfUnused(unused)) {
        throw new Error('Could not verify or remove one or more unused images.');
      }
      return { ok: true };
    } catch (error) {
      return this._fail(error);
    }
  }

  _fail(error) {
    this.lastError = error?.message || 'Something went wrong.';
    console.error(this.lastError);
    return { ok: false, message: this.lastError };
  }
}

const siteLayoutService = new SiteLayoutService();

export default siteLayoutService;