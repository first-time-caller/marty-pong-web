import feedparser
import requests
from collections import Counter
from datetime import datetime
import time
import re
import json
import os

class FinancialNewsDashboard:
    def __init__(self):
        # RSS feeds for financial news
        self.rss_feeds = [
            'https://feeds.bloomberg.com/markets/news.rss',
            'https://www.cnbc.com/id/100003114/device/rss/rss.html',
            'https://feeds.finance.yahoo.com/rss/2.0/headline',
            'https://www.ft.com/?format=rss',
        ]
        
        # Major market indexes to track
        self.major_indexes = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX']
        
        # Financial keywords to track
        self.currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD', 'Bitcoin', 'Ethereum']
        self.commodities = ['Gold', 'Silver', 'Oil', 'Crude', 'Gas', 'Copper', 'Wheat', 'Corn']
        
        # Common stock tickers pattern
        self.ticker_pattern = re.compile(r'\b[A-Z]{1,5}\b')

        # Load financial terminology dataset
        self.dataset_path = os.path.join(os.path.dirname(__file__), 'financial_terms.json')
        self.terms = {}
        try:
            with open(self.dataset_path, 'r', encoding='utf-8') as f:
                self.terms = json.load(f)
        except Exception:
            # Fallback minimal sets if file missing
            self.terms = {
                'currencies': {},
                'commodities': ['Gold', 'Silver', 'Oil'],
                'sectors': [],
                'companies': {},
                'indexes': ['SPY','QQQ','DIA','IWM','VIX'],
                'stopwords': []
            }

        # convenience references
        self.company_to_ticker = {k.upper(): v for k, v in self.terms.get('companies', {}).items()}
        self.known_tickers = set(self.terms.get('indexes', [])) | set(self.company_to_ticker.values())
        self.stopwords = set([w.upper() for w in self.terms.get('stopwords', [])])
        self.commodities = [c.upper() for c in self.terms.get('commodities', [])]
        self.currencies_dict = {k.upper(): v for k, v in self.terms.get('currencies', {}).items()}
        
    def fetch_rss_headlines(self):
        """Fetch headlines from RSS feeds"""
        print("\n" + "="*80)
        print("📰 FETCHING FINANCIAL NEWS HEADLINES")
        print("="*80 + "\n")
        
        all_headlines = []
        articles_data = []
        
        for feed_url in self.rss_feeds:
            try:
                feed = feedparser.parse(feed_url)
                feed_name = feed.feed.title if hasattr(feed, 'feed') else 'Unknown Source'
                
                print(f"📡 {feed_name}")
                for entry in feed.entries[:5]:  # Get top 5 from each feed
                    title = entry.title
                    link = entry.link if hasattr(entry, 'link') else ''
                    published = entry.published if hasattr(entry, 'published') else 'N/A'
                    
                    all_headlines.append(title)
                    articles_data.append({
                        'title': title,
                        'link': link,
                        'published': published,
                        'source': feed_name
                    })
                    print(f"  • {title}")
                print()
            except Exception as e:
                print(f"  ⚠️  Error fetching feed: {str(e)}\n")
                
        return all_headlines, articles_data
    
    def extract_financial_terms(self, headlines):
        """Extract currencies, commodities, and company tickers from headlines"""
        print("\n" + "="*80)
        print("🔍 ANALYZING HEADLINES FOR FINANCIAL TERMS")
        print("="*80 + "\n")
        
        all_text = ' '.join(headlines).upper()
        
        # Find currencies
        currency_mentions = {}
        for currency in self.currencies:
            count = all_text.count(currency.upper())
            if count > 0:
                currency_mentions[currency] = count
        
        # Find commodities
        commodity_mentions = {}
        for commodity in self.commodities:
            count = all_text.count(commodity.upper())
            if count > 0:
                commodity_mentions[commodity] = count
        
        # Find potential stock tickers
        words = all_text.split()
        potential_tickers = [word for word in words if self.ticker_pattern.match(word) and len(word) <= 5]
        ticker_counter = Counter(potential_tickers)
        
        # Expanded filter for common words that aren't tickers
        common_words = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 
                       'OUT', 'NEW', 'HAS', 'ITS', 'WHO', 'MAY', 'FROM', 'WITH', 'SAID', 'WILL', 'MORE', 'BEEN',
                       'HAVE', 'THAT', 'THIS', 'THEY', 'WERE', 'THAN', 'INTO', 'SAYS', 'MOST', 'OVER', 'SOME',
                       'WHAT', 'WHEN', 'WHERE', 'AFTER', 'COULD', 'ABOUT', 'THEIR', 'WHICH', 'WOULD', 'THERE',
                       'THESE', 'THOSE', 'STOCK', 'SALES', 'MARKET', 'YEAR', 'DEAL', 'TECH']
        
        # Known major tickers to prioritize
        known_tickers = ['AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NVDA', 'AMD', 'INTC', 'NFLX',
                        'BABA', 'DIS', 'BA', 'GM', 'F', 'XOM', 'CVX', 'JPM', 'BAC', 'WFC', 'V', 'MA', 'NOW']
        
        # First, map company names to tickers and filter tokens
        ticker_mentions = {}
        for word, count in ticker_counter.items():
            # skip stopwords and short tokens
            if word in self.stopwords or len(word) < 2:
                continue

            # if token matches a company name in dataset
            if word in self.company_to_ticker:
                ticker = self.company_to_ticker[word]
                ticker_mentions[ticker] = ticker_mentions.get(ticker, 0) + count
                continue

            # if token is already a ticker-like token and in known tickers list
            if word in self.known_tickers or (self.ticker_pattern.match(word) and len(word) <= 5):
                ticker_mentions[word] = ticker_mentions.get(word, 0) + count
                continue

            # else ignore as likely common word
        
        # Display results
        print("💱 CURRENCIES MENTIONED:")
        if currency_mentions:
            for currency, count in sorted(currency_mentions.items(), key=lambda x: x[1], reverse=True):
                print(f"  {currency}: {'█' * count} ({count})")
        else:
            print("  None found")
            
        print("\n📦 COMMODITIES MENTIONED:")
        if commodity_mentions:
            for commodity, count in sorted(commodity_mentions.items(), key=lambda x: x[1], reverse=True):
                print(f"  {commodity}: {'█' * count} ({count})")
        else:
            print("  None found")
            
        print("\n📊 POTENTIAL STOCK TICKERS MENTIONED:")
        if ticker_mentions:
            for ticker, count in sorted(ticker_mentions.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {ticker}: {'█' * count} ({count})")
        else:
            print("  None found")
        
        return currency_mentions, commodity_mentions, ticker_mentions
    
    def get_stock_data(self, symbol):
        """Fetch stock data using Yahoo Finance API alternative (free tier)"""
        try:
            # Using a free API endpoint (Alpha Vantage free tier or similar)
            # Note: In production, you'd need an API key
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d"
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if we got valid data
                if 'chart' not in data or 'result' not in data['chart'] or not data['chart']['result']:
                    return None
                
                result = data['chart']['result'][0]
                
                # Check if meta data exists
                if 'meta' not in result:
                    return None
                
                current_price = result['meta']['regularMarketPrice']
                previous_close = result['meta']['previousClose'] if 'previousClose' in result['meta'] else result['meta']['chartPreviousClose']
                change = current_price - previous_close
                change_percent = (change / previous_close) * 100
                
                return {
                    'symbol': symbol,
                    'price': current_price,
                    'change': change,
                    'change_percent': change_percent,
                    'previous_close': previous_close
                }
            else:
                return None
        except Exception as e:
            # Silently fail for invalid tickers
            return None
    
    def track_market_indexes(self):
        """Track major market indexes"""
        print("\n" + "="*80)
        print("📈 MAJOR MARKET INDEXES")
        print("="*80 + "\n")
        
        index_data = []
        for symbol in self.major_indexes:
            data = self.get_stock_data(symbol)
            if data:
                index_data.append(data)
                arrow = "🔺" if data['change'] >= 0 else "🔻"
                color = "+" if data['change'] >= 0 else ""
                print(f"{arrow} {data['symbol']:5s} | ${data['price']:8.2f} | {color}{data['change']:+7.2f} ({data['change_percent']:+6.2f}%)")
            time.sleep(0.5)  # Rate limiting
        
        return index_data
    
    def find_top_movers(self, ticker_mentions):
        """Find stocks with biggest price movements from mentioned tickers"""
        print("\n" + "="*80)
        print("🚀 TOP MOVERS FROM NEWS (Mentioned Tickers)")
        print("="*80 + "\n")
        
        movers = []
        for ticker in list(ticker_mentions.keys())[:15]:  # Check top 15 mentioned
            data = self.get_stock_data(ticker)
            if data:
                movers.append(data)
            time.sleep(0.5)  # Rate limiting
        
        # Sort by absolute change percent
        movers.sort(key=lambda x: abs(x['change_percent']), reverse=True)
        
        if movers:
            print("Top 10 by % Change:\n")
            for i, stock in enumerate(movers[:10], 1):
                arrow = "🔺" if stock['change'] >= 0 else "🔻"
                color = "+" if stock['change'] >= 0 else ""
                print(f"{i:2d}. {arrow} {stock['symbol']:5s} | ${stock['price']:8.2f} | {color}{stock['change']:+7.2f} ({stock['change_percent']:+6.2f}%)")
        else:
            print("No valid stock data found for mentioned tickers.")
        
        return movers
    
    def link_news_to_stocks(self, articles_data, ticker_mentions):
        """Link news articles to specific stocks"""
        print("\n" + "="*80)
        print("🔗 NEWS ARTICLES LINKED TO STOCKS")
        print("="*80 + "\n")
        
        top_tickers = sorted(ticker_mentions.items(), key=lambda x: x[1], reverse=True)[:5]
        
        for ticker, count in top_tickers:
            print(f"\n📊 {ticker} (mentioned {count} times):")
            related_articles = [article for article in articles_data if ticker in article['title'].upper()]
            
            if related_articles:
                for article in related_articles[:3]:  # Show top 3 articles
                    print(f"  • {article['title']}")
                    print(f"    Source: {article['source']} | {article['published']}")
            else:
                print("  No specific articles found.")
    
    def run_dashboard(self):
        """Run the complete dashboard"""
        print("\n")
        print("╔" + "="*78 + "╗")
        print("║" + " "*20 + "FINANCIAL NEWS & MARKET DASHBOARD" + " "*25 + "║")
        print("║" + " "*25 + f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}" + " "*23 + "║")
        print("╚" + "="*78 + "╝")
        
        # Step 1: Fetch RSS headlines
        headlines, articles_data = self.fetch_rss_headlines()
        
        # Step 2: Analyze for financial terms
        currency_mentions, commodity_mentions, ticker_mentions = self.extract_financial_terms(headlines)
        
        # Step 3: Track major indexes
        index_data = self.track_market_indexes()
        
        # Step 4: Find top movers from mentioned stocks
        movers = self.find_top_movers(ticker_mentions)
        
        # Step 5: Link news to stocks
        self.link_news_to_stocks(articles_data, ticker_mentions)
        
        print("\n" + "="*80)
        print("✅ DASHBOARD COMPLETE")
        print("="*80 + "\n")


if __name__ == "__main__":
    dashboard = FinancialNewsDashboard()
    dashboard.run_dashboard()
