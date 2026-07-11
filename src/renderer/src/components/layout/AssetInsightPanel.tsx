import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Asset, CompanyProfile } from '@renderer/types/market'
import { dataService } from '@renderer/data/dataService'
import { formatMarketCap, formatShareCount } from '@renderer/lib/formatFinance'
import { IconClose } from '@renderer/components/icons/Icons'

export default function AssetInsightPanel({
  asset,
  onClose
}: {
  asset: Asset
  onClose: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  // Initialized straight from asset.klass so a non-stocks asset never shows a loading
  // flash — no fetch is even attempted for it below.
  const [loading, setLoading] = useState(asset.klass === 'stocks')
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    setLogoFailed(false)
    if (asset.klass !== 'stocks') {
      setProfile(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    dataService.getCompanyProfile(asset).then((data) => {
      if (!cancelled) {
        setProfile(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.symbol, asset.klass])

  return (
    <div className="asset-insight-panel">
      <button className="asset-insight-close" onClick={onClose} aria-label={t('assetInsight.close')}>
        <IconClose size={14} />
      </button>
      {asset.klass !== 'stocks' ? (
        <div className="asset-insight-unavailable">{t('assetInsight.unavailableForClass')}</div>
      ) : loading ? (
        <div className="asset-insight-loading">{t('assetInsight.loading')}</div>
      ) : profile ? (
        <div className="asset-insight-body">
          <div className="asset-insight-head">
            {profile.logo && !logoFailed ? (
              <img
                className="asset-insight-logo"
                src={profile.logo}
                alt=""
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="asset-insight-logo-fallback">{profile.symbol.charAt(0)}</div>
            )}
            <div className="asset-insight-head-text">
              <div className="asset-insight-name">{profile.name}</div>
              {profile.industry && <div className="asset-insight-industry">{profile.industry}</div>}
            </div>
          </div>
          <div className="asset-insight-stats">
            <div className="asset-insight-stat">
              <span>{t('assetInsight.marketCap')}</span>
              <b>{formatMarketCap(profile.marketCapitalization)}</b>
            </div>
            <div className="asset-insight-stat">
              <span>{t('assetInsight.sharesOutstanding')}</span>
              <b>{formatShareCount(profile.shareOutstanding)}</b>
            </div>
            <div className="asset-insight-stat">
              <span>{t('assetInsight.exchange')}</span>
              <b>{profile.exchange}</b>
            </div>
            <div className="asset-insight-stat">
              <span>{t('assetInsight.ipo')}</span>
              <b>{profile.ipo}</b>
            </div>
            <div className="asset-insight-stat">
              <span>{t('assetInsight.country')}</span>
              <b>{profile.country}</b>
            </div>
          </div>
          {profile.website && (
            <a className="asset-insight-link" href={profile.website} target="_blank" rel="noreferrer">
              {t('assetInsight.website')}
            </a>
          )}
        </div>
      ) : (
        <div className="asset-insight-unavailable">{t('assetInsight.notFound')}</div>
      )}
    </div>
  )
}
