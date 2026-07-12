import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Asset, CompanyProfile } from '@renderer/types/market'
import { dataService } from '@renderer/data/dataService'
import { formatMarketCap, formatShareCount } from '@renderer/lib/formatFinance'
import { getEtfProfile, type EtfProfile } from '@renderer/data/etfProfiles'
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
  // A known ETF profile is resolved synchronously (no fetch), so seed it straight from the
  // initial asset — same reasoning as `loading` below.
  const [etfProfile, setEtfProfile] = useState<EtfProfile | null>(() => getEtfProfile(asset.symbol))
  // Initialized straight from asset.klass/getEtfProfile so neither a non-stocks asset nor a
  // known ETF ever shows a loading flash — no fetch is even attempted for either below.
  const [loading, setLoading] = useState(asset.klass === 'stocks' && !getEtfProfile(asset.symbol))
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    setLogoFailed(false)
    // ETF profiles are looked up synchronously and take priority over the stocks
    // company-profile fetch — a fund ticker has no operating-company profile to fetch.
    const etf = getEtfProfile(asset.symbol)
    if (etf) {
      setEtfProfile(etf)
      setProfile(null)
      setLoading(false)
      return
    }
    setEtfProfile(null)
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
      {etfProfile ? (
        <div className="asset-insight-body">
          <div className="asset-insight-head">
            <div className="asset-insight-logo-fallback">{asset.symbol.charAt(0)}</div>
            <div className="asset-insight-head-text">
              <div className="asset-insight-name">{asset.name}</div>
              <div className="asset-insight-industry">{etfProfile.issuer}</div>
            </div>
          </div>
          <div className="asset-insight-stats">
            <div className="asset-insight-stat">
              <span>{t('assetInsight.etfCategory')}</span>
              <b>{etfProfile.category}</b>
            </div>
            <div className="asset-insight-stat">
              <span>{t('assetInsight.etfIndexTracked')}</span>
              <b>{etfProfile.indexTracked}</b>
            </div>
            <div className="asset-insight-stat">
              <span>{t('assetInsight.etfExpenseRatio')}</span>
              <b>
                {etfProfile.expenseRatio != null
                  ? t('assetInsight.etfExpenseRatioValue', { value: etfProfile.expenseRatio })
                  : t('assetInsight.etfExpenseRatioNotPublished')}
              </b>
            </div>
          </div>
          <div className="asset-insight-composition">
            <div className="asset-insight-composition-label">{t('assetInsight.etfComposition')}</div>
            <p className="asset-insight-composition-text">{etfProfile.composition}</p>
          </div>
        </div>
      ) : asset.klass !== 'stocks' ? (
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
