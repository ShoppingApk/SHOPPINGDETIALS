import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import RatingStars from './RatingStars';
import { LineSkeleton } from './Skeleton';
import { productsApi } from '../api/products';
import { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

function ReviewForm({ productId, existing, onSaved }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRating(existing?.rating || 0);
    setComment(existing?.comment || '');
  }, [existing]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please choose a star rating');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await productsApi.addReview(productId, { rating, comment: comment.trim() });
      toast.success(existing ? 'Review updated' : 'Thanks for your review!');
      onSaved(data);
    } catch (err) {
      setError(errMsg(err, 'Could not save your review'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-gray-50 p-4" noValidate>
      <p className="mb-2 text-sm font-semibold">{existing ? 'Update your review' : 'Rate this product'}</p>
      <div className="flex items-center gap-3">
        <RatingStars value={rating} onChange={(n) => { setRating(n); setError(''); }} />
        {rating > 0 && <span className="text-sm text-gray-600">{RATING_WORDS[rating]}</span>}
      </div>
      <label htmlFor="review-comment" className="label mt-3">Your review (optional)</label>
      <textarea
        id="review-comment"
        rows={3}
        maxLength={1000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was the quality, fit and delivery?"
        className="input resize-y"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-gray-400">{comment.length}/1000</span>
        {error && <span className="text-sm text-red-600" role="alert">{error}</span>}
      </div>
      <button type="submit" className="btn-primary mt-3" disabled={busy}>
        {busy ? 'Saving…' : existing ? 'Update review' : 'Submit review'}
      </button>
    </form>
  );
}

export default function ReviewsSection({ productId, rating, numReviews, onRatingChange }) {
  const { user } = useAuth();
  const location = useLocation();
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError('');
      try {
        const data = await productsApi.reviews(productId, p);
        setReviews((prev) => (p === 1 ? data.reviews : [...prev, ...data.reviews]));
        setPage(p);
        setPages(data.pagination.pages);
        setTotal(data.pagination.total);
      } catch (err) {
        setError(errMsg(err, 'Could not load reviews'));
      } finally {
        setLoading(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const mine = user ? reviews.find((r) => String(r.user?._id) === String(user.id)) : null;

  return (
    <section aria-labelledby="reviews-title" className="card p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-title" className="text-lg font-bold">Ratings &amp; reviews</h2>
        {numReviews > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
            <div>
              <RatingStars value={rating} variant="stars" size={16} />
              <p className="text-xs text-gray-500">{numReviews.toLocaleString('en-IN')} ratings</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        {user ? (
          <ReviewForm
            productId={productId}
            existing={mine}
            onSaved={(data) => {
              onRatingChange?.(data.product);
              load(1);
            }}
          />
        ) : (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            <Link to="/login" state={{ from: location.pathname }} className="font-semibold text-brand-600 hover:underline">Log in</Link> to rate and review this product.
          </p>
        )}
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Customer reviews {total > 0 && `(${total})`}</h3>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error} <button type="button" onClick={() => load(page)} className="underline">Retry</button>
          </p>
        )}
        {!error && !loading && reviews.length === 0 && (
          <p className="text-sm text-gray-500">No written reviews yet. Be the first to share your thoughts!</p>
        )}
        <ul className="divide-y divide-gray-100">
          {reviews.map((r) => (
            <li key={r._id} className="py-3">
              <div className="flex items-center gap-2">
                <RatingStars value={r.rating} />
                <span className="text-sm font-medium">{RATING_WORDS[r.rating]}</span>
              </div>
              {r.comment && <p className="mt-1.5 whitespace-pre-line text-sm text-gray-700">{r.comment}</p>}
              <p className="mt-1.5 text-xs text-gray-400">
                {r.user?.name || 'Customer'} · {formatDate(r.updatedAt || r.createdAt)}
              </p>
            </li>
          ))}
        </ul>
        {loading && <LineSkeleton lines={3} />}
        {!loading && page < pages && (
          <button type="button" onClick={() => load(page + 1)} className="btn-outline mt-3 w-full md:w-auto">
            Show more reviews
          </button>
        )}
      </div>
    </section>
  );
}
